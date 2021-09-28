Pos = {};

Pos.Service = function() {
    var me = this;
    me.connected = false;
}

Pos.Service.prototype = {
    isConnected: function(callback) {
        var me = this;
        if (me.connected) {
            return true;
        }
        var data = {
            method: 'GET',
            url: '/customers/1343',
            key: Config.Pos.api_key,
            success: function(response) {
                callback(true)
                console.log(response);
            },
            failure: function() {
                callback(false)
                console.log("Failed to connect to POS");
            }
        };
        me._request(data);
    },
    _request: function(config) {
        var me = this;
        var xhr = me._newXHR();
        var endpoint = Config.Pos.url;
        xhr.open(config.method, endpoint + config.url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        if (config.key) {
            xhr.setRequestHeader("x-api-key", config.key);
        }
        if (config.data) {
            xhr.setRequestHeader("Content-length", JSON.stringify(config.data));
        }
        xhr.setRequestHeader("accept", "application/json");
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
                return;
            }
            if (xhr.status === 0) {
                config.failure(xhr.status, { message: 'PoS Connection failure', errors: [] });
                return;
            }
            var response;
            if (xhr.responseText) {
                try {
                    response = JSON.parse(xhr.responseText);
                } catch (err) {
                    config.failure(xhr.status, { message: 'Failed to parse PoS response', errors: [] });
                    return;
                }
            }
            if (xhr.status >= 200 && xhr.status < 400) {
                config.success(response);
            } else {
                config.failure(xhr.status, response);
            }
        };
        if (config.data) {
            return xhr.send(JSON.stringify(config.data));
        } else {
            return xhr.send();
        }
    },
    _newXHR: function () {
        var xhr = null;
        if (window.XDomainRequest) {
            console.log("using XdomainRequest for IE");
            var fireReadyStateChange = function (xhr, status) {
                xhr.status = status;
                xhr.readyState = 4;
                try {
                    xhr.onreadystatechange();
                } catch(e) {
                }
            };
            xhr = new XDomainRequest();
            xhr.readyState = 0;
            xhr.onload = function () {
                var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async = "false";
                xmlDoc.loadXML(xhr.responseText);
                xhr.responseXML = xmlDoc;
                fireReadyStateChange(xhr, 200);
            };
            xhr.onerror = function () {
                fireReadyStateChange(xhr, 500);
            };
            xhr.ontimeout = function () {
                fireReadyStateChange(xhr, 500);
            };
        } else if (window.XMLHttpRequest) {
            console.log("using XMLHttpRequest");
            xhr = new XMLHttpRequest();
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType("text/xml; charset=utf-8");
            }
        } else if (window.ActiveXObject) {
            console.log("using ActiveXObject");
            xhr = new ActiveXObject("Microsoft.XMLHTTP");
        }
        return xhr;
    },
    getCustomer: function(phone, call, callback) {
        var me = this;
        var data = {
            method: 'GET',
            url: '/customers?limit=1&search_field=phone_number&search=' + phone,
            key: Config.Pos.api_key,
            success: function(response) {
                var customer = new Pos.Customer(response[0]);
                console.log(customer);
                callback(call, customer);
            },
            failure: function() {
                console.log("Failed to retrieve the customer's information.");
                callback(call, null);
            }
        };
        me._request(data);
    }
}

Pos.Customer = function(data) {
    this.personId = data.person_id;
    this.firstname = data.first_name;
    this.lastname = data.last_name;
    this.email = data.email;
    this.phone = data.phone_number;
    this.address_1 = data.address_1;
    this.address_2 = data.address_2;
    this.city = data.city;
    this.zip = data.zip;
    this.country = data.country;
    this.comments = data.comments;
    this.company = data.company_name;
    this.accountNumber = data.account_number;
    this.internalNote = data.internal_notes;
    this.balance = data.balance;
    this.creditLimit = data.credit_limit;
    this.points = data.points;
    this.disableLoyalty = data.disable_loyalty;
    this.amountToSpendForNextPoint = data.amount_to_spend_for_next_point;
    this.remainingSalesBeforeDiscount = data.remaining_sales_before_discount;
}

Pos.Customer.prototype.constructor = Pos.Customer;
