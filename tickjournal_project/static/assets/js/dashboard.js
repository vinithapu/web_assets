function changeContent(divNumber, newHeading, clickedButton, popupId) {
  const dynamicHeadingId = `dynamicHeading${popupId}`;
  const dynamicHeading = document.getElementById(dynamicHeadingId);
  if (dynamicHeading) {
    dynamicHeading.innerText = newHeading;
  }

  const allDivs = popupId === 1 ? ["div1", "div2"] : ["div3", "div4"];

  allDivs.forEach(divId => {
    const div = document.getElementById(divId);
    if (div) {
      if (divId === `div${divNumber}`) {
        div.style.display = "block";
      } else {
        div.style.display = "none";
      }
    }
  });

  const buttons = document.querySelectorAll(`#popup${popupId} .content-btn`);
  buttons.forEach(button => button.classList.remove("active"));

  if (clickedButton) {
    clickedButton.classList.add("active");
  }
}


const modal = document.getElementById('popup-modal');
const closeBtn = document.querySelector('.close-btn');

const btn1 = document.getElementById('btn1');
const btn2 = document.getElementById('btn2');
const content1 = document.getElementById('content1');
const content2 = document.getElementById('content2');
const modalTitle = document.getElementById('modal-title');

const rows = document.querySelectorAll('.show-popup');

rows.forEach(row => {
    row.addEventListener('click', function() {
        modal.style.display = 'block';
    });
});

closeBtn.addEventListener('click', function() {
    modal.style.display = 'none';
});

btn1.addEventListener('click', function() {
    content1.classList.remove('hidden');
    content2.classList.add('hidden');
    btn1.classList.add('active');
    btn2.classList.remove('active');
    modalTitle.textContent = "New Trade";
});

btn2.addEventListener('click', function() {
    content1.classList.add('hidden');
    content2.classList.remove('hidden');
    btn2.classList.add('active');
    btn1.classList.remove('active');
    modalTitle.textContent = "Edit Trade";
});

window.addEventListener('click', function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
});

