const { Toast } = bootstrap;
const DEFAULT_NB_SALES = 5;
var connector;
var pos;

var onLabelSet = function onLabelSet(id) {
    var me = this;
    var client = me.calls[id].id;
    alert(client);
};

Cti.Platform = function () {
    // some initialization
    Cti.log("Loading connector");
    var me = this;
    $('#cti-status').html("Loading connector...");
    $('#cti-status')
            .removeClass()
            .addClass('p-0 alert alert-warning');
    connector = new Cti.Connector({
        // callback
        onMessage: function(message) {
            me.onMessage(message);
        }
    });
    $('#pos-status').html("Loading service...");
    $('#pos-status')
            .removeClass()
            .addClass('p-0 alert alert-warning');
    pos = new Pos.Service();
};

Cti.Platform.prototype = {
    username: null,
    calls: {},
    loadedCustomers: {},
    rowTimeouts: [],
    callEvents: [
        Cti.EVENT.INITIAL, Cti.EVENT.ACCEPTED, Cti.EVENT.RINGING, Cti.EVENT.CONNECTED, Cti.EVENT.ON_HOLD, Cti.EVENT.HANGUP, Cti.EVENT.CANCEL
    ],
    run: function () {
        var me = this;
        if (!connector.isConnected()) {
            document.title = "Ready";
            $('#cti-status')
                    .html("Platform ready: Not connected.")
                    .removeClass()
                    .addClass('p-0 alert alert-info');
        }
        var bindedCallback = me.connectPos.bind(me);
        if (!pos.isConnected(bindedCallback)) {
            $('#pos-status')
                .html("Authentication...")
                .removeClass()
                .addClass('p-0 alert alert-warning');
        }
    },
    connectPos: function(connected) {
        if (connected) {
            $('#pos-status')
                    .html("Connected")
                    .removeClass()
                    .addClass('p-0 alert alert-success');
            } else {
                $('#pos-status')
                    .html("Error")
                    .removeClass()
                    .addClass('p-0 alert alert-danger');
        }
    },
    login: function () {
        var username = arguments[0];
        $('#cti-status')
            .html("Authentication " + username + "...")
            .removeClass()
            .addClass('p-0 alert alert-warning');
        this.username = username;
        connector.login.apply(connector, arguments);
    },
    logout: function () {
        this.username = null;
        connector.logout();
    },
    customerFromCall: function(call) {
        var me = this;
        if (call.direction == "INBOUND") {
            var parsedPhone = me.parsePhone(call.source);
        } else {
            var parsedPhone = me.parsePhone(call.destination);
        }
        var bindedCallback = me.assignCustomer.bind(me);
        pos.getCustomer(parsedPhone, call, bindedCallback);
    },
    assignCustomer: function(call, customer) {
        var me = this;
        if (customer) {
            me.calls[call.id].posId = customer.personId;
            me.calls[call.id].firstname = customer.firstname;
            me.calls[call.id].lastname = customer.lastname;
            me.calls[call.id].email = customer.email;
            me.calls[call.id].note = customer.note;
            me.calls[call.id].balance = customer.balance;
            // Retrieves the customer's previous sales
            var bindedCallback = me.assignSales.bind(me);
            pos.getSales(customer.personId, call, bindedCallback);
        } else {
            me.calls[call.id].posId = "ERROR";
            me.calls[call.id].firstname = "";
            me.calls[call.id].lastname = "";
            me.calls[call.id].email = "";
            me.calls[call.id].note = "";
        }
        $('#prenom-' + call.id).replaceWith('<td id="prenom-'+call.id+'"><input type="text" name="prenom" class="form-control" placeholder="prenom" value='+thisCall.firstname+' /></td>');
        $('#nom-' + call.id).replaceWith('<td id="nom-'+call.id+'"><input type="text" name="nom" class="form-control" placeholder="nom" value='+thisCall.lastname+' /></td>');
        $('#email-' + call.id).replaceWith('<td id="email-'+call.id+'"><a href="mailto:'+thisCall.email+'" type="text" name="email" class="btn btn-primary"><i class="bi-envelope-fill"></i></a></td>');
        $('#note-' + call.id).replaceWith('<td id="note-'+call.id+'"><input type="text" name="note" class="form-control" placeholder="note" value="'+thisCall.note+'" /></td>');
        $('#poslink-' + call.id).replaceWith('<td id="poslink-'+call.id+'"><a href="https://md.phppointofsale.com/index.php/customers/view/'+thisCall.posId+'" target="_blank" onclick="" class="btn btn-primary"><i class="bi-info-lg"></i></a></td>');
        me.refreshDisplay();
    },
    assignSales: function(call, sales) {
        var me = this;
        if (sales == "FAILURE") {
            me.calls[call.id].sales = "FAILURE";
            $('#factures-' + call.id).replaceWith('<td id="factures-'+call.id+'">error</td>');
        } else {
            me.calls[call.id].sales = sales;
            $('#factures-' + call.id).replaceWithPush('<td id="factures-'+call.id+'"><a type="button" class="btn btn-secondary sales-button" id="sales-button-'+call.id+'"><i class="bi-cash-coin"></i></a></td>');
            var popoverBtn = document.getElementById('sales-button-'+call.id);
            var popover = new bootstrap.Popover(popoverBtn, {
                title: 'Ventes précédentes '+call.firstname+' '+call.lastname+
                    '<button type="button" id="closePopover" class="btn-sm float-end" onclick="$(&quot;.sales-button&quot;).popover(&quot;hide&quot;);">&times;</button>',
                placement: 'bottom',
                boundary: 'window',
                trigger: 'click hover',
                html: true,
                container: 'body',
                content: function() {
                    var table = me.salesTemplate(call);
                    return table;
                }
            });
            popoverBtn.addEventListener('inserted.bs.popover', function() {
                me.updateSalesTable(DEFAULT_NB_SALES, call.id);
            });
            popoverBtn.addEventListener('show.bs.popover', function() {
                me.disableRowTimeout(call.id);
            });
            popoverBtn.addEventListener('hide.bs.popover', function() {
                me.enableRowTimeout(call.id, true);
            });
        }
    },
    enableRowTimeout: function(callId, unlock = false) {
        var me = this;
        if (unlock || me.rowTimeouts[callId] != "LOCKED") {
            me.rowTimeouts[callId] = setTimeout(function() {
                delete(me.calls[callId]);
                $('#call-' + callId).remove();
            }, 30000);
        }
    },
    disableRowTimeout: function(callId) {
        var me = this;
        clearTimeout(me.rowTimeouts[callId]);
        me.rowTimeouts[callId] = "LOCKED";
    },
    submitCustomer: function(callId) {
        var me = this;
        var call = me.calls[callId];
        if (call) {
            $('#update-' + call.id).replaceWith('<td id="update-' + callId + '"><div class="boxLoading"></div></td>');
            var bindedCallback = me.updateResult.bind(me);
            var firstname = $("#prenom-"+callId)[0].children[0].value;
            var lastname = $("#nom-"+callId)[0].children[0].value;
            var note = $("#note-"+callId)[0].children[0].value;
            pos.updateCustomer(bindedCallback, call, firstname, lastname, note);
        }
    },
    updateResult: function(response, call) {
        $('#update-' + call.id).replaceWith('<td id="update-' + callId + '"><a href="#" onclick="Cti.Platform.prototype.submitCustomer('+callId+')" class="btn btn-primary"><i class="bi-arrow-right"></i></a></td>');
        if (response) {
            $(".toast").removeClass("bg-danger");
            $(".toast").addClass("bg-success");
            $(".toast-body").text("Customer updated successfully");
        } else {
            $(".toast").removeClass("bg-success");
            $(".toast").addClass("bg-danger");
            $(".toast-body").text("Failed to update the customer.");
        }
        var toast = new Toast($(".toast"));
        toast.show();
    },
    parsePhone: function(phone) {
        var num = phone.match(/\d/g);
        num = num.join("");
        if (num.charAt(0) == 1) {
            num = num.substring(1);
        }
        num = num.slice(0,3) + '-' + num.slice(3);
        num = num.slice(0,7) + '-' + num.slice(7);
        return num;
    },
    onCallEvent: function(call) {
        var me = this;
        if (call.status == "RINGING") {
            if (me.calls[call.id]) {
                me.refreshDisplay();
            }
        }
        if (call.status == "HANGUP" ) {
            if (me.calls[call.id]) {
                me.calls[call.id].status = call.status;
                me.refreshDisplay();
                clearInterval(refreshTimer);
                me.enableRowTimeout(call.id);
            }
        } else {
            if (!me.calls[call.id]) {
                me.calls[call.id] = call;
            }
        }
        if (call.status == "ON_HOLD" ) {
            me.calls[call.id].status = call.status;
        }
        if (call.status == "CONNECTED" ) {
            me.calls[call.id].status = call.status;
            var refreshTimer = setInterval(function() {
                me.refreshDisplay();
            }, 3000);
        }
    },
    refreshDisplay: function() {
        var me = this;
        for (callId in me.calls) {
            thisCall = me.calls[callId];
            var status = '<td id="status-' + callId + '">' + thisCall.status + '</td>';
            if ($('#call-' + callId).length) {
                $('#status-' + callId).replaceWith(status);
                if (!thisCall.posId && thisCall.posId != "ERROR") {
                    me.customerFromCall(thisCall);
                }
            } else {
                var row = '<tr id="call-' + callId + '">';
                row += status;
                row += '<td>' + thisCall.source + '</td>';
                row += '<td>' + thisCall.destination + '</td>';
                row += '<td>' + thisCall.destinationName + '</td>';
                row += '<td id="prenom-' + callId + '"><div class="boxLoading"></div></td>';
                row += '<td id="nom-' + callId + '"><div class="boxLoading"></div></td>';
                row += '<td id="email-' + callId + '"><div class="boxLoading"></div></td>';
                row += '<td id="note-' + callId + '"><div class="boxLoading"></div></td>';
                row += '<td id="factures-' + callId + '"><div class="boxLoading"></div></td>';
                row += '<td id="poslink-' + callId + '"><div class="boxLoading"></div></td>';
                row += '<td id="update-' + callId + '"><a href="#" onclick="Cti.Platform.prototype.submitCustomer('+callId+')" class="btn btn-primary"><i class="bi-arrow-right"></i></a></td>';
                row += '</tr>';
                $('#calls-table tr:last').after(row);
            }
        }
    },
    salesTemplate: function(call) {
        var me = this;
        if (call.balance) {
            var balance = '<span id="balance-'+call.id+'" class="bg-warning text-dark">Balance: '+call.balance+'$</span>';
        } else {
            var balance = '';
        }
        var template = $(
        '<div class="row" id="sales-popover-'+call.id+'"> \
            <div class="tab-content"> \
                <div> \
                    '+balance+' \
                    <input class="float-end" type="number" min="1" max="15" step="1" value="5" name="nbVentes" onchange="Cti.Platform.prototype.updateSalesTable(this.value,'+call.id+')"> \
                    <span class="mx-2 float-end">Nombre de ventes: </span> \
                </div> \
                <div class="tab-pane active" role="tabpanel"> \
                    <table class="table table-striped" id="sales-table-'+call.id+'"> \
                        <thead><tr> \
                            <th>ID</th> \
                            <th>Date</th> \
                            <th>Sous-Total</th> \
                            <th>Total</th> \
                            <th>Nb. Articles</th> \
                            <th>Commande</th> \
                            <th>POS</th> \
                        </tr></thead> \
                        <tbody></tbody> \
                    </table> \
                </div> \
            </div> \
        </div>');
        return template;
    },
    updateSalesTable: function(nbSales, callId) {
        var me = this;
        var call = me.calls[callId];
        if (call) {
            var table = $('#sales-table-'+callId);
            table.find('tbody tr').empty();
            for (var i = 0; i < nbSales && i < call.sales.length; i++) {
                var index = call.sales.length - i - 1;
                var sale = call.sales[index];
                var row = '<tr>';
                row += '<td>' + sale.saleId + '</td>';
                row += '<td>' + sale.saleTime + '</td>';
                row += '<td>' + sale.subtotal + '</td>';
                row += '<td>' + sale.total + '</td>';
                row += '<td>' + sale.cartItems.length + '</td>';
                row += '<td>' + (sale.customFields.commande ? 'Oui' : "Non") + '</td>';
                row += '<td><a href="https://md.phppointofsale.com/index.php/sales/receipt/'+sale.saleId+'" target="_blank" onclick="" class="btn btn-primary"><i class="bi-info-lg"></i></a></td>';
                row += '</tr>';
                table.find('tbody').append(row);
            }
        } else {
            console.log("The rows cannot be updated because the customer isn't there anymore.");
        }
    },
    onMessage: function (event) {
        var me = this;
        Cti.log(event);
        if (event.name === Cti.EVENT.READY) {
            document.title = "Connected";
            $('#cti-status')
                    .html("Connected")
                    .removeClass()
                    .addClass('p-0 alert alert-success');
            $('#disconnect').show();
            $('#login-form').hide();
            if (me.bootstrap) {
                me.bootstrap();
            }
        }
        if ($.inArray(event.name, me.callEvents) !== -1) {
            me.onCallEvent(event.call);
        }
        if ($.inArray(event.name, [Cti.EVENT.ERROR, Cti.EVENT.INFO]) !== -1) {
            document.title = "Error";
            $('#cti-status')
                    .html("Error")
                    .removeClass()
                    .addClass('p-0 alert alert-danger');
            alert(event.message);
        }
        if (event.name === Cti.EVENT.LOGGED_IN) {}
        if (event.name === Cti.EVENT.LOGGED_OUT) {
            document.title = "Ready";
            $('#cti-status')
                    .html("Platform ready: Not connected.")
                    .removeClass()
                    .addClass('p-0 alert alert-info');
            $('#login-form').show();
            $('#disconnect').hide();
        }
    }
};

$().ready(function () {
    var platform = new Cti.Platform();
    platform.bootstrap = function() {
        Cti.log('Subscribing to all user events');
        var myUserId = connector._getParam('user_id');
        connector.apiRequest('GET', '/users', null, function(json) {
            json.data.forEach(function(user) {
                if (user.id == myUserId) {
                    return;
                }
                connector.subscribe('user:' + user.id);
            });
        });
    };
    // run platform
    platform.run();
    $('#connect-with-username-password').click(function() {
        platform.login($('#username').val(), $('#password').val());
    });
    $('#connect-with-api-key').click(function() {
        platform.login($('#api_key').val());
    });
    $('#disconnect').click(function() {
        platform.logout();
    });
    // Configure bootstrap's sanitizer
    var myDefaultAllowList = bootstrap.Tooltip.Default.allowList;
    myDefaultAllowList.button = ['onclick'];
    myDefaultAllowList.table = [];
    myDefaultAllowList.thead = [];
    myDefaultAllowList.tbody = [];
    myDefaultAllowList.tr = ['data-bs-option'];
    myDefaultAllowList.td = ['data-bs-option'];
    myDefaultAllowList.th = ['data-bs-option'];
});

$.fn.replaceWithPush = function (a) {
  var $a = $(a);
  this.replaceWith($a);
  return $a;
};
