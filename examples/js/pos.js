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
            success: function() {
                callback(true);
            },
            failure: function(error) {
                console.log("Failed to connect to POS. See the error below.");
                console.log(error);
                callback(false);
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
                if (response.length) {
                    var customer = new Pos.Customer(response[0]);
                    callback(call, customer);
                }
            },
            failure: function() {
                console.log("Failed to retrieve the customer's information.");
                callback(call, null);
            }
        };
        me._request(data);
    },
    updateCustomer: function(callback, call, prenom, nom, note) {
        var me = this;
        if (prenom || nom || note) {
            var data = {
                method: 'POST',
                url: '/customers/' + call.posId,
                key: Config.Pos.api_key,
                data: {
                    first_name: prenom,
                    last_name: nom,
                    custom_fields: {
                        notesappels: note
                    }
                },
                success: function(response) {
                    callback(true, call);
                },
                failure: function(error) {
                    console.log("Failed to update the customer's information. See the error below.");
                    console.log(error);
                    callback(false, call);
                }
            };
            me._request(data);
        } else {
            console.log("Not updating empty customer values.")
        }
    },
    getSales: function(personId, call, callback) {
        var me = this;
        var today = new Date();
        var strToday = 'Y-m-d'
            .replace('Y', today.getFullYear())
            .replace('m', ('0'+(today.getMonth()+1)).slice(-2))
            .replace('d', ('0'+today.getDate()).slice(-2));
        var prevPeriod = new Date();
        var strPrevPeriod = 'Y-m-d'
            .replace('Y', prevPeriod.getFullYear() - 20)
            .replace('m', ('0'+(prevPeriod.getMonth()+1)).slice(-2))
            .replace('d', ('0'+prevPeriod.getDate()).slice(-2));
        var data = {
            method: 'GET',
            url: '/sales?customer_id='+personId+'&start_date='+strPrevPeriod+'&end_date='+strToday,
            key: Config.Pos.api_key,
            success: function(response) {
                // For some reasons, this is reached more often than the request is called
                var sales = [];
                if (response.length) {
                    response.forEach(function(item) {
                        sales.push(new Pos.Sale(item));
                    });
                    callback(call, sales);
                }
            },
            failure: function() {
                console.log("Failed to retrieve the customer's information.");
                callback(call, "FAILURE");
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
    this.note = data.custom_fields.notesappels || "";
    this.balance = data.balance;
    this.creditLimit = data.credit_limit;
    this.points = data.points;
    this.disableLoyalty = data.disable_loyalty;
    this.amountToSpendForNextPoint = data.amount_to_spend_for_next_point;
    this.remainingSalesBeforeDiscount = data.remaining_sales_before_discount;
}

Pos.Customer.prototype.constructor = Pos.Customer;

Pos.Sale = function(data) {
    this.saleId = data.sale_id;
    this.saleTime = data.sale_time;
    this.pointsUsed = data.points_used;
    this.pointsGained = data.points_gained;
    this.employeeId = data.employee_id;
    this.deleted = data.deleted;
    this.comment = data.comment;
    this.storeAccountPayment = data.store_account_payment;
    this.registerId = data.register_id;
    this.customerId = data.customer_id;
    this.customerBalance = data.customer_balance;
    this.customerPoints = data.customer_points;
    this.soldByEmployeeId = data.sold_by_employee_id;
    this.discountReason = data.discount_reason;
    this.hasDelivery = data.has_delivery;
    this.delivery = data.delivery;
    this.subtotal = data.subtotal;
    this.tax = data.tax;
    this.total = data.total;
    this.tip = data.tip;
    this.profit = data.profit;
    this.customFields = data.custom_fields;
    this.returnSaleId = data.return_sale_id;
    this.payments = data.payments;
    this.cartItems = data.cart_items;
}

Pos.Sale.prototype.constructor = Pos.Sale;
