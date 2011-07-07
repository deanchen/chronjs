var numImages = 0;
var imagesLeft = 0;
var IMAGE_HTML = "<img id='tempPreview' />";
var dropLabelStartText = "";

$(document).ready(function() {
	dropLabelStartText = $("#droplabel").text();

	// init event handlers
	var dropbox = document.getElementById("dropbox");

	dropbox.addEventListener("dragenter", function(evt) {
		evt.stopPropagation();
		evt.preventDefault();
	}, false);

	dropbox.addEventListener("dragexit", function(evt) {
		evt.stopPropagation();
		evt.preventDefault();
	}, false);

	dropbox.addEventListener("dragover", function(evt) {
		evt.stopPropagation();
		evt.preventDefault();
	}, false);

	dropbox.addEventListener("drop", function(evt) {
		evt.stopPropagation();
		evt.preventDefault();

		var files = evt.dataTransfer.files;
		var count = files.length;

		// Only call the handler if 1 or more files was dropped.
		if (count > 0) {
			imagesLeft = count;
			
			if(count == 1) {
				$("#droplabel").text("Processing " + files[0].name);
			}
			else {
				$("#droplabel").text("Processing files...");
			}

			$.each(files,function(index,file) {
				// begin the read operation
				var reader = new FileReader();

				// init the reader event handlers
				reader.onprogress = handleReaderProgress;
				reader.onloadend = handleReaderLoadEnd;

				reader.readAsDataURL(file);
			});
		}
	}, false);

	// init the widgets
	//$("#progressbar").progressbar();
});

function handleReaderProgress(evt) {
	if (evt.lengthComputable) {
		var loaded = (evt.loaded / evt.total);

		//$("#progressbar").progressbar({ value: loaded * 100 });
	}
}

function handleReaderLoadEnd(evt) {
	//$("#progressbar").progressbar({ value: 100 });

	$.ajax({
   		type: "POST",
  		url: "/test-upload",
   		data: "imagedata="+evt.target.result,

		error: function(msg) {
			alert(msg);
		},

   		success: function(msg) {
     			$("#pictureholder").append(IMAGE_HTML);

			var img = $("#tempPreview");

			img.hide();
			img.attr("id","picture"+numImages);
			numImages++;

			img.attr("src",evt.target.result);
			img.attr("width","200");
			img.attr("height","200");

			img.fadeIn('slow');

			imagesLeft --;

			if(imagesLeft == 0)	
			{
				$("#droplabel").text(dropLabelStartText);	
			}
   		}
 	});	
}