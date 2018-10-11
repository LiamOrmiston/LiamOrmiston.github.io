// Adapted from: https://www.w3schools.com/howto/howto_css_modal_images.asp

// Get the modal
var modal = document.getElementById('myModal');

// On click display resume
var img = document.getElementById('myResume');
img.onclick = function(){
  modal.style.display = "block";
}

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}
