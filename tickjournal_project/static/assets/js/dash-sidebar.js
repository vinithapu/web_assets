const sidebarToggle = document.getElementById("sidebarToggle");

const sidebar = document.querySelector(".sidebar");

sidebarToggle.addEventListener("click", function() {
    sidebar.classList.toggle("active");
    this.classList.toggle("active");
});
