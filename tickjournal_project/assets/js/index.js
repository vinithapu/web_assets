// header js
const menuBtn = document.querySelector('.menu-btn'); 
const nav = document.querySelector('nav');         
const shadowBg = document.querySelector('.shadow-bg'); 
const gradientBox = document.querySelector('.gradient-box'); 

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 

    nav.classList.toggle('active');

    shadowBg.classList.toggle('active');

    gradientBox.classList.toggle('active', shadowBg.classList.contains('active'));

    menuBtn.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !menuBtn.contains(e.target)) {
        nav.classList.remove('active');
        
        shadowBg.classList.remove('active');
        gradientBox.classList.remove('active');

        menuBtn.classList.remove('active');
    }
});

let currentIndex = 0;
const quotes = [
    {
        image: `${staticURL}assets/media/Profile.png`,
        text: 'TickJournal has transformed how I manage my trades. The simplicity and effectiveness are unmatched!',
        clientName: 'Emily Clark',
        clientLocation: 'Trader'
    },
    {
        image: `${staticURL}assets/media/Profile.png`,
        text: 'TickJournal has transformed how I manage my trades. The simplicity and effectiveness are unmatched!',
        clientName: 'Emily Clark',
        clientLocation: 'Trader'
    },
    {
        image: `${staticURL}assets/media/Profile.png`,
        text: 'A powerful tool for anyone in trading. It keeps everything organized and accessible at all times.',
        clientName: 'Robert Lee',
        clientLocation: 'Investor'
    },
    {
        image: `${staticURL}assets/media/Profile.png`,
        text: 'TickJournal offers a seamless experience. The dashboard tracking is a lifesaver for professionals.',
        clientName: 'Sophia Davis',
        clientLocation: 'Financial Advisor'
    },
    {
        image: `${staticURL}assets/media/Profile.png`,
        text: 'I love the trade tag feature! It makes tracking my strategies so much easier.',
        clientName: 'Michael Brown',
        clientLocation: 'Forex Trader'
    },
    {
        image: `${staticURL}assets/media/Profile.png`,
        text: 'The customer support is outstanding. They are available 24/7 to resolve issues quickly.',
        clientName: 'Laura Wilson',
        clientLocation: 'Crypto Enthusiast'
    }
];

function generateDots() {
    const dotsContainer = document.querySelector('.dots');
    dotsContainer.innerHTML = '';

    quotes.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        if (index === currentIndex) {
            dot.classList.add('active');
        }
        dot.addEventListener('click', () => dotClick(index));
        dotsContainer.appendChild(dot);
    });
}

function updateQuoteSlide() {
    const quoteImage = document.querySelector('.quote-img img');
    const quoteText = document.querySelector('.quote-text p');
    const clientName = document.querySelector('.client-name');
    const clientLocation = document.querySelector('.client-location');

    quoteImage.src = quotes[currentIndex].image;
    quoteText.textContent = quotes[currentIndex].text;
    clientName.textContent = quotes[currentIndex].clientName;
    clientLocation.textContent = quotes[currentIndex].clientLocation;

    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.classList.remove('active');
        if (index === currentIndex) {
            dot.classList.add('active');
        }
    });
}

function nextQuote() {
    currentIndex = (currentIndex + 1) % quotes.length;
    updateQuoteSlide();
}

function prevQuote() {
    currentIndex = (currentIndex - 1 + quotes.length) % quotes.length;
    updateQuoteSlide();
}

function dotClick(index) {
    currentIndex = index;
    updateQuoteSlide();
}

document.querySelector('.left-icon').addEventListener('click', prevQuote);
document.querySelector('.right-icon').addEventListener('click', nextQuote);

window.onload = function () {
    generateDots();
    updateQuoteSlide();
};

setInterval(nextQuote, 10000);

// show and hide password
function togglePassword(inputId, eyeHideId, eyeShowId) {
    const input = document.getElementById(inputId);
    const eyeHide = document.getElementById(eyeHideId);
    const eyeShow = document.getElementById(eyeShowId);

    if (input.type === 'password') {
        input.type = 'text';
        eyeHide.style.display = 'none';  // Hide the "closed eye" image
        eyeShow.style.display = 'block';  // Show the "open eye" image
    } else {
        input.type = 'password';
        eyeHide.style.display = 'block';  // Show the "closed eye" image
        eyeShow.style.display = 'none';  // Hide the "open eye" image
    }
}


document.addEventListener('DOMContentLoaded', function() {
    // Get all tab buttons and content
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Add click event to each tab button
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to current button
            this.classList.add('active');

            // Get the tab to show
            const tabId = this.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
});