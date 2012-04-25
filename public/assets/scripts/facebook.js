window.fbAsyncInit = function() {
    var readTriggerTime = 20000;
    FB.init({
        appId      : '335954613131615', // App ID
        //channelUrl : '//WWW.YOUR_DOMAIN.COM/channel.html', // Channel File
        status     : true, // check login status
        cookie     : true, // enable cookies to allow the server to access the session
        xfbml      : true  // parse XFBML
    });

    if (location.pathname.match("/article/(.*)")) {
        var readTrigger = null;
        FB.Event.subscribe('auth.statusChange', function(response) {
            if (response.authResponse) {
                var accessToken = response.authResponse.accessToken;
                var status = "on";
                if ($.cookie("disable-sharing")) {
                    status = "off";
                }
                $('article').append(
                    "<div id='social-share'>" +
                        "<div class='activities' style='display:none'></div>" +
                        "<a class='share-button' href='#'>Sharing is <u>" + status + "</u></a>" +
                        "<a class='activity-button' href='#'>" +
                            "<img class='activity-icon' src='/images/icons/social-activity-icon.png'></img>" +
                        "</a>" +
                    "</div>"
                );
                updateRecentActivities(accessToken);
                if (status === "on") {
                    readTrigger = setTimeout(function(){markRead(accessToken)}, readTriggerTime);
                }

                $('#social-share .activity-button').click(function(event) {
                    event.stopPropagation();
                    event.preventDefault();
                    $('#social-share .activities').toggle();
                });
                var shareButton = $('#social-share .share-button');
                shareButton.click(function(event) {
                    event.stopPropagation();
                    event.preventDefault();
                    if (status === "on") {
                       status = "off";
                        $.cookie("disable-sharing", true);
                        clearTimeout(readTrigger)
                    } else {
                      status = "on"
                        $.cookie("disable-sharing", null);
                        readTrigger = setTimeout(function(){markRead(accessToken)}, readTriggerTime);

                    }
                    shareButton.html("Sharing is <u>" + status + "</u>");

                });
            }
        });

        // subscribe to like button
        FB.Event.subscribe('edge.create', function(url) {
            _gaq.push(['_trackSocial', 'facebook', 'like', url]);
        });
    }
};

// Load the SDK Asynchronously
(function(d){
    var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
    if (d.getElementById(id)) {return;}
js = d.createElement('script'); js.id = id; js.async = true;
js.src = "//connect.facebook.net/en_US/all.js";
ref.parentNode.insertBefore(js, ref);
}(document));


function markRead(accessToken) {
                var url = "http://www.dukechronicle.com" + location.pathname;
                $.post(
                    "https://graph.facebook.com/me/dukechronicle:read",
                    {article: url, access_token: accessToken},
                    function() {
                        updateRecentActivities(accessToken);
                    },
                    "json"
                )
}

function updateRecentActivities(accessToken) {
    $.getJSON('https://graph.facebook.com/me/dukechronicle:read',
        {limit: 5, access_token: accessToken},
        function(data) {
            var html = "<h4>Recent Activity</h4><table>";
            var first = "first";
            _.forEach(data.data, function(row) {html+=
                "<tr id='activity-" + row.id + "' class='" + first + "'>" +
                    "<td class='url'><a href='" + row.data.article.url + "'>" + row.data.article.title + "</a></td>" +
                    "<td class='delete'><a class='delete' data-id='" + row.id + "' href='#'>x</a></td>" +
                    "</tr>"
                first = "";
            });
            html += "</table>";
            $('#social-share .activities').empty();
            $('#social-share .activities').append(html);
            $('#social-share .activities td.delete').delegate("a", "click", function() {
                var activityId = $(this).attr("data-id");
                $('#activity-' + activityId).remove();
                $.get("/xhrproxy/delete_activity", {activity_id: activityId, access_token: accessToken });
                return false;
            });
        }
    );
}
