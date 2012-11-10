// Analytics
    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', 'UA-5900287-15']);
    _gaq.push(['_setDomainName', 'qduke.com']);
    _gaq.push(['_trackPageview']);

    (function() {
        var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
        ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    })();

// Search Functions
function search(engine) {
    var target = engine || "Google";

    var redirect;
    var query = $('.boxSearch input').val() || "";
    if (target == "Duke") {
        redirect = 'http://duke.edu/search/?q=' + query;
    } else if (target == "WolframAlpha") {
        redirect = 'http://www.wolframalpha.com/input/?i=' + query;
    } else if (target == "Wikipedia") {
        redirect = 'http://en.wikipedia.org/wiki/Special:Search?search=' + query;
    } else {
        redirect = 'http://google.com/search?q=' + query;
    }
    _gaq.push(['_trackEvent', 'Search', target, query, 0]);
    // TODO(rivkees): allow new window
    setTimeout('document.location = "' + redirect + '"', 100);
}
function searchOnEnter(e) {
    if (e.keyCode == 13) {
        search()
    }
}

// Tab Switching
function changeTab(tab) {
    $(".menu .box").removeClass("selectedTab");
    $("#tabFrame .tabContent").removeClass("tabShown");

    setTimeout(function(){
        $(".menu .box:nth-child("+(tab*2-1)+")").addClass("selectedTab");
        $("#tabFrame .tabContent:nth-child("+tab+")").addClass("tabShown");
    }, 500);
    _gaq.push(['_trackEvent', 'Change Tab', $(".menu .box:nth-child("+(tab*2-1)+")").text(), tab, 0]);
}

function statusbar(docs, weather, sports) {


}

/*********************
* AJAX Loading Stuff *
**********************/
// Article Logic
function showArticles(docs) {
    // Always put Top Headline in Status Bar
    console.log(docs["Top Headline"])
    if (docs["Top Headline"] != undefined) {
        console.log("top headline");
        for (var i in docs["Top Headline"]) {
            console.log(i)
            var article = docs["Top Headline"][i];
            $("#boxStatus").append(
                $("<a class='box' />").attr("href", "http://dukechronicle.com" + article.url).text(article.title)
            );
        }
    }
    var count = 0;
    var boxStories = $(".boxStories .boxEmpty");
    var sections = ['Breaking', 'Slideshow', 'Top Headline', 'Popular'];
    // Run through all sections
    for (var section in sections) {
        var articles = docs[sections[section]];
        for (var i in articles) {
            // Special By section
            if (sections[section] == 'Breaking') {
                $(boxStories[count]).addClass("breaking").append(
                $("<div>").addClass("caption captionTop").append($("<div>").addClass("txt").text("Breaking")));
            }
            if (sections[section] == 'Popular') {
                $(boxStories[count]).append(
                $("<div>").addClass("caption captionTop").append($("<div>").addClass("txt").text("Popular")));
            }
            // All
            var article = articles[i];
            var img ="";
            if (article.images && article.images.ThumbRect && article.images.ThumbRect.url) {
                img = article.images.ThumbRect.url;
            }
            else {
                img = "/img/qduke/default_image.jpg";
            }
            $(boxStories[count]).attr("href", "http://dukechronicle.com" + article.url).append(
                $("<div>").addClass("caption").append($("<div>").addClass("txt").text(article.title))).append(
                $("<img>").attr("src", img)).removeClass("boxEmpty");
            count++;
            if (count >= 4) return;
        }
    }
}
// Weather
function showWeather(weather) {
    var forcast = '<h3>Now</h3><img src="'+weather.image+'"/><p> '+weather.currently+'</p><p>'+weather.temp+'&deg;'+weather.units.temp+' ('+weather.tempAlt+'&deg;C)</p>'
    $("#boxStatus").append(
        $("<a class='box' />").attr("href", "http://weather.com").html(forcast)
    );
    var forcast = '<h3>Tomorrow</h3><p>'+weather.tomorrow.forecast+'</p><p>High '+weather.tomorrow.high+'&deg;'+weather.units.temp+' - Low '+weather.tomorrow.low+'&deg;'+weather.units.temp;
    $("#boxStatus").append(
        $("<a class='box' />").attr("href", "http://weather.com").html(forcast)
    );       
    // html = "<h4>Currently</h4>";
    // html +='<p> '+weather.currently+'</p><p>'+weather.temp+'&deg; '+weather.units.temp+' ('+weather.tempAlt+'&deg; C)</p>';
    // //html += '<h2>'+weather.city+', '+weather.region+' '+weather.country+'</h2>';
    // html += "<h4>Later</h4>";
    // html += '<p>'+weather.forecast+'</p><p>High '+weather.high+'&deg; '+weather.units.temp+' - Low '+weather.low+'&deg; '+weather.units.temp+'</p>';
    // //html += '<p><strong>Wind</strong>: '+weather.wind.direction+' '+weather.wind.speed+' '+weather.units.speed+' <strong>Wind Chill</strong>: '+weather.wind.chill+'</p>';
    // html += '<p><img src="'+weather.image+'"></p>';
    // // html += '<p>Humidity'+weather.humidity+' <strong>Pressure</strong>: '+weather.pressure+' <strong>Rising</strong>: '+weather.rising+' <strong>Visibility</strong>: '+weather.visibility+'</p>';
    // // html += '<p><strong>Heat Index</strong>: '+weather.heatindex+'"></p>';
    // //html += '<p><strong>Sunrise</strong>: '+weather.sunrise+' - <strong>Sunset</strong>: '+weather.sunset+'</p>';
    // html += '<p>Last updated '+weather.updated+'</p>';
    // $("#contentWeather .box:nth-child(1)").append(html);
    // html = "";
    // html += '<p>'+weather.tomorrow.forecast+'</p><p>High '+weather.tomorrow.high+' - Low '+weather.tomorrow.low;
    // html += '<p><img src="'+weather.tomorrow.image+'"></p>';
    //$("#contentWeather .box:nth-child(2)").append(html);
}

var channels = {
    'ESPN': '/img/qduke/channels/espn.png',
    'ESPN2': '/img/qduke/channels/espn2.png',
    'ESPN3': '/img/qduke/channels/espn3.png',
    'ESPNU': '/img/qduke/channels/espnu.png',
}

// Parse RSS to JSON
function sports(url) {
    $.ajax({
        url: document.location.protocol + '//ajax.googleapis.com/ajax/services/feed/load?v=1.0&output=xml&num=20&callback=?&q=' + encodeURIComponent(url),
        dataType: 'json',
        success: function(data) {
            xml = $.parseXML(data.responseData.xmlString);
            date = "";
            $(xml).find("item").each(function(){
                sport = $(this).find("sport").text();
                opponent = $(this).find("opponent").text();
                loc = $(this).find("location").text();
                time = $(this).find("time").text();
                tv = $(this).find("tv").text();
                //tournamentname = $(this).find("tournamentname").text();
                homeaway = $(this).find("homeaway").text();
                if (homeaway == "H") homeaway = "vs.";
                else if (homeaway == "A") homeaway = "@";
                else if (homeaway == "N") homeaway = "-";
                dc = $(this).find("pubDate").text();
                //guid = $(this).find("guid").text();
                if (date != dc) {
                    $("#contentSports .sportsList").append("<h4 class='sportDate'>"+dc+"</h4>");
                    date = dc;
                }
                if (tv != "") {
                    if (channels[tv] != undefined ) {
                        tv = " <span class='sportTv'><img src='"+channels[tv]+"' /></span>";
                    }
                    else {
                        tv = " <span class='sportTv'><span class='showing'>Live on: </span>"+tv+"</span>";
                    }
                }
                $("#contentSports .sportsList").append("<div class='sportEvent'>"
                        +"<span class='sportTime'>"+time+"</span>"
                        +" <span class='sportTeam'>"+sport+"</span> "+homeaway+" "+opponent
                        +" <span class='sportLocation'>"+loc+"</span>"
                        +tv
                    +"</div>");
                //console.log($(this));
            });
        }
    });
}

// On Load
$(function(){
    // Outbound Link Tracking with Google Analytics
    // Requires jQuery 1.7 or higher (use .live if using a lower version)
    // http://wptheming.com/2012/01/tracking-outbound-links-with-google-analytics/
    $("a:not(.boxButton)").on('click',function(e){
        var url = $(this).attr("href");
        // TODO(rivkees): If using dynamic weather, change this
        var text = $(this).text() || url
        if (e.currentTarget.host != window.location.host) {
            _gaq.push(['_trackEvent', 'Outbound Links', text, url, 0]);
            if (e.metaKey || e.ctrlKey) {
                 var newtab = true;
            }
            if (!newtab) {
                 e.preventDefault();
                 setTimeout('document.location = "' + url + '"', 100);
            }
        }
    });

    // Uservoice
    // var uvOptions = {};
    // (function() {
    //     var uv = document.createElement('script'); uv.type = 'text/javascript'; uv.async = true;
    //     uv.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + 'widget.uservoice.com/SMeZbkqkN4ufhQRlnWig.js';
    //     var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(uv, s);
    // })();

    // Search Focus
    $('.boxSearch input').focus();

    // Load Dynamic Content on Load
    $(document).ready(function() {
        // News
        $.ajax({
            url: 'http://www.dukechronicle.com/api/qduke',
            dataType: "jsonp",
            cache: false,
            timeout: 20000,
            success: function(data) {
                showArticles(data.docs)
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // TODO(rivkees): display error
                $(".boxStories .boxEmpty").text("Error Loading Articles.")
                console.log("Error loading articles:" + errorThrown)
            }
        });
        // Load Weather
        $.simpleWeather({
            zipcode: '27708',
            unit: 'f',
            success: function(weather) {
                showWeather(weather);
            },
            error: function(error) {
                    $("#contentWeather .box").html("<p>"+error+"</p>");
            }
        });
    });

    // Load Intense Frames
    $("#tabFrame .tabContent[data-content]").each(function(index, element){
        $(element).append($(element).attr("data-content"));
    });

    // Load Sports
    sports("http://www.goduke.com/rss.dbml?db_oem_id=4200&media=schedulesxml");
});