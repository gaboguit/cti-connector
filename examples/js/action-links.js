
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
            .addClass('label label-warning');
    connector = new Cti.Connector({
        // callback
        onMessage: function(message) {
            me.onMessage(message);
        }
    });
    $('#pos-status').html("Loading service...");
    $('#pos-status')
            .removeClass()
            .addClass('label label-warning');
    pos = new Pos.Service();
};

Cti.Platform.prototype = {
    username: null,
    calls: {},
    loadedCustomers: {},
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
                    .addClass('label label-info');
        }
        var bindedCallback = me.connectPos.bind(me);
        if (!pos.isConnected(bindedCallback)) {
            $('#pos-status')
                .html("Authentication...")
                .removeClass()
                .addClass('label label-warning');
        }
    },
    connectPos: function(connected) {
        if (connected) {
            $('#pos-status')
                    .html("Connected")
                    .removeClass()
                    .addClass('label label-success');
            } else {
                $('#pos-status')
                    .html("Error")
                    .removeClass()
                    .addClass('label label-danger');
        }
    },
    login: function () {
        var username = arguments[0];
        $('#cti-status')
            .html("Authentication " + username + "...")
            .removeClass()
            .addClass('label label-warning');
        this.username = username;
        connector.login.apply(connector, arguments);
    },
    logout: function () {
        this.username = null;
        connector.logout();
    },
    assignCustomer: function(call, customer) {
        var me = this;
        if (customer) {
            me.calls[call.id].posId = customer.personId;
            me.calls[call.id].firstname = customer.firstname;
            me.calls[call.id].lastname = customer.lastname;
            me.calls[call.id].email = customer.email;
            me.calls[call.id].note = customer.note;
        } else {
            me.calls[call.id].posId = "";
            me.calls[call.id].firstname = "";
            me.calls[call.id].lastname = "";
            me.calls[call.id].email = "";
            me.calls[call.id].note = "";
        }
        $('#prenom-' + call.id).replaceWith('<td id="prenom-'+call.id+'"><input type="text" name="prenom" class="form-control" placeholder="prenom" value='+thisCall.firstname+' /></td>');
        $('#nom-' + call.id).replaceWith('<td id="nom-'+call.id+'"><input type="text" name="nom" class="form-control" placeholder="nom" value='+thisCall.lastname+' /></td>');
        $('#email-' + call.id).replaceWith('<td id="email-'+call.id+'"><a href="mailto:'+thisCall.email+'" type="text" name="email" class="btn btn-primary"><span class="glyphicon glyphicon-envelope"></span></a></td>');
        $('#note-' + call.id).replaceWith('<td id="note-'+call.id+'"><input type="text" name="note" class="form-control" placeholder="note" value="'+thisCall.note+'" /></td>');
        $('#poslink-' + call.id).replaceWith('<td id="poslink-'+call.id+'"><a href="https://md.phppointofsale.com/index.php/customers/view/'+thisCall.posId+'" target="_blank" onclick="" class="btn btn-primary"><span class="glyphicon glyphicon-square-info"></span> View</a></td>');
        me.refreshDisplay(call);
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
                if (me.calls[call.id].direction == "INBOUND") {
                    var parsedPhone = me.parsePhone(call.source);
                } else {
                    var parsedPhone = me.parsePhone(call.destination);
                }
                var bindedCallback = me.assignCustomer.bind(me);
                pos.getCustomer(parsedPhone, call, bindedCallback);
                me.refreshDisplay(call);
            }
        }
        if (call.status == "HANGUP" ) {
            if (me.calls[call.id]) {
                me.calls[call.id].status = call.status;
                me.refreshDisplay(call);
                clearInterval(refreshTimer);
                setTimeout(function() {
                    delete(me.calls[call.id]);
                    $('#call-' + call.id).remove();
                    me.locks[call.id] = false;
                }, 30000);
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
                me.refreshDisplay(call);
            }, 3000);
        }
    },
    refreshDisplay: function(call) {
        var me = this;
        for (callId in me.calls) {
            thisCall = me.calls[callId];
            var status = '<td id="status-' + callId + '">' + thisCall.status + '</td>';
            if ($('#call-' + callId).length) {
                $('#status-' + call.id).replaceWith(status);
                console.log("REPLACED");
            } else {
                var row = '<tr id="call-' + callId + '">';
                row += status;
                row += '<td>' + thisCall.source + '</td>';
                row += '<td>' + thisCall.destination + '</td>';
                row += '<td>' + thisCall.destinationName + '</td>';
                row += '<td id="prenom-'+callId+'"><div class="boxLoading"></div></td>';
                row += '<td id="nom-'+callId+'"><div class="boxLoading"></div></td>';
                row += '<td id="email-'+callId+'"><div class="boxLoading"></div></td>';
                row += '<td id="note-'+callId+'"><div class="boxLoading"></div></td>';
                row += '<td id="poslink-'+callId+'"><div class="boxLoading"></div></td>';
                row += '<td><a href="#" onclick="" class="btn btn-primary"><span class="glyphicon glyphicon-arrow-right"></span> Set</a></td>';
                row += '</tr>';
                $('#calls-table tr:last').after(row);
                console.log("ADDED");
            }
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
                    .addClass('label label-success');
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
                    .addClass('label label-danger');
            alert(event.message);
        }
        if (event.name === Cti.EVENT.LOGGED_IN) {}
        if (event.name === Cti.EVENT.LOGGED_OUT) {
            document.title = "Ready";
            $('#cti-status')
                    .html("Platform ready: Not connected.")
                    .removeClass()
                    .addClass('label label-info');
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
});
