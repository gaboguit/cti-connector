
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
    $('#status').html("Loading connector...");
    $('#status')
            .removeClass()
            .addClass('label label-warning');
    connector = new Cti.Connector({
        // callback
        onMessage: function(message) {
            me.onMessage(message);
        }
    });
    pos = new Pos.Service();
};

Cti.Platform.prototype = {
    username: null,
    calls: {},
    callEvents: [
        Cti.EVENT.INITIAL, Cti.EVENT.ACCEPTED, Cti.EVENT.RINGING, Cti.EVENT.CONNECTED, Cti.EVENT.ON_HOLD, Cti.EVENT.HANGUP, Cti.EVENT.CANCEL
    ],
    run: function () {
        if (!connector.isConnected()) {
            document.title = "Ready";
            $('#status')
                    .html("Platform ready: Not connected.")
                    .removeClass()
                    .addClass('label label-info');
        }
    },
    login: function () {
        var username = arguments[0];
        $('#status')
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
            me.calls[call.id].firstname = customer.firstname;
            me.calls[call.id].lastname = customer.lastname;
            me.calls[call.id].email = customer.email;
            me.calls[call.id].note = customer.internalNote;
        }
        me.calls[call.id].loadingCustomer = false;
        me.refreshDisplay(call);
    },
    onCallEvent: function(call) {
        var me = this;
        if (call.status == "RINGING") {
            if (me.calls[call.id]) {
                me.calls[call.id].loadingCustomer = true;
                var parsedPhone = call.source.slice(0,3) + '-' + call.source.slice(3);
                var parsedPhone = parsedPhone.slice(0,7) + '-' + parsedPhone.slice(7);
                var bindedCallback = me.assignCustomer.bind(me);
                pos.getCustomer(parsedPhone, call, bindedCallback);
                me.refreshDisplay(call);
            }
        }
        if (call.status == "HANGUP" ) {
            if (me.calls[call.id]) {
                me.calls[call.id].status = call.status;
                // Q: What is the purpose of this variable?
                callStatus = call.status;
                console.log(me.calls);
                me.refreshDisplay(call);
                clearInterval(refreshTimer);
                setTimeout(function() {
                    delete(me.calls[call.id]);
                    $('#call-' + call.id).remove();
                }, 2000);
            }
        } else {
            if (!me.calls[call.id]) {
                me.calls[call.id] = call;
            }
        }
        if (call.status == "ON_HOLD" ) {
            me.calls[call.id].status = call.status;
            // Q: What is the purpose of this variable?
            callStatus = call.status;
            console.log(me.calls);
        }
        if (call.status == "CONNECTED" ) {
            me.calls[call.id].status = call.status;
            // Q: What is the purpose of this variable?
            callStatus = call.status;
            console.log(me.calls);
            // Q: So there is a timer refreshing the display for each call event?
            var refreshTimer = setInterval(function() {
                me.refreshDisplay(call);
            }, 3000);
        }
    },
    refreshDisplay: function(call) {
        var me = this;
        for (callId in me.calls) {
            thisCall = me.calls[callId];
            var row = '<tr id="call-' + callId + '">';
            row += '<td>' + thisCall.status + '</td>';
            row += '<td>' + thisCall.source + '</td>';
            row += '<td>' + thisCall.destination + '</td>';
            row += '<td>' + thisCall.destinationName + '</td>';
            console.log(thisCall.loadingCustomer);
            if (thisCall.loadingCustomer) {
                row += '<td><div class="boxLoading"></div></td>';
                row += '<td><div class="boxLoading"></div></td>';
                row += '<td><div class="boxLoading"></div></td>';
                row += '<td><div class="boxLoading"></div></td>';
            } else {
                row += '<td><input type="text" name="prenom" class="form-control" placeholder="prenom" value=' + thisCall.firstname + ' /></td>';
                row += '<td><input type="text" name="nom" class="form-control" placeholder="nom" value=' + thisCall.lastname + ' /></td>';
                row += '<td><input type="text" name="email" class="form-control" placeholder="email" value=' + thisCall.email + ' /></td>';
                row += '<td><input type="text" name="note" class="form-control" placeholder="note" value=' + thisCall.note + ' /></td>';
            }
            row += '<td><a href="#" onclick="" class="btn btn-primary"><span class="glyphicon glyphicon-arrow-right"></span> Set</a></td>';
            row += '</tr>';
            // Q: So all existing calls are replaced with the current call?
            if ($('#call-' + callId).length) {
                $('#call-' + call.id).replaceWith(row);
                console.log('replaced');
            } else {
                $('#calls-table tr:last').after(row);
            }
        }
    },
    onMessage: function (event) {
        var me = this;
        Cti.log(event);
        if (event.name === Cti.EVENT.READY) {
            document.title = "Connected";
            $('#status')
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
            $('#status')
                    .html("Error")
                    .removeClass()
                    .addClass('label label-danger');
            alert(event.message);
        }
        if (event.name === Cti.EVENT.LOGGED_IN) {
            // add code if needed
        }
        if (event.name === Cti.EVENT.LOGGED_OUT) {
            document.title = "Ready";
            $('#status')
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
