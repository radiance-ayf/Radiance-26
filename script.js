const eventDate = new Date("June 27, 2026 09:00:00");

function updateCountdown() {

const now = new Date();

const diff = eventDate - now;

const days = Math.floor(diff/(1000*60*60*24));

document.getElementById("countdown").innerHTML =
`⏳ ${days} Days To Go`;

}

const eventDetails = {

quiz: {
title: "❓ Genesis Face-off",
body: `

<h3>Rules</h3>
<ul>
<br>
<li>Portion: Book of Genesis</li>
<li>Two participants per church</li>
<li>Questions will be asked in Tamil only</li>
<li>Prelims begin at 10:00 AM sharp</li>
</ul>
`
},

trivia: {
title: "📖 Gospel Unleashed",
body: `

<p><strong>Participants:</strong> 2 per church</p>
<p></p>
<br>
<h3>Topics Covered</h3>
<ul>
<li>Bible Stories</li>
<li>Bible Characters</li>
<li>Bible Places</li>
<li>Bible Verses</li>
<li>Lyrics</li>
<li>General Christian Songs</li>
<li>Order of Service</li>
<li>Lectionary</li>
<li>Lutheran Traditions</li>
</ul>
`
},

singing: {
title: "🎤 Incandescent Voices",
body: `

<h3>Rules</h3>
<br>
<ul>
<li>Theme-based performance</li>
<li>Minimum 4 members per church</li>
<li>5 minutes including introduction</li>
<li>Karaoke is not allowed</li>
<li>Own composition carries extra marks</li>
<li>3 copies of lyrics must be submitted</li>
</ul>
`
},

depiction: {
title: "🎭 Divine Dramatics",
body: `

<p><strong>Participants:</strong> 1 per church</p>
<br>
<p></p>
<h3>Rules</h3>
<ul>
<li>Any biblical character can be portrayed</li>
<li>Time limit: 1 minute</li>
<li>Background music and pictures are allowed</li>
<li>Materials must be emailed on or before June 14</li>
<li>Email: radiance.ayf@gmail.com</li>
<li>Recorded vocals are strictly prohibited</li>
<li>Background dialogues are strictly prohibited</li>
</ul>
`
},

drawing: {
title: "🎨 Heavenly Creation",
body: `


<p><strong>Participants:</strong> 1 per church</p>
<br>
<h3>Rules</h3>
<ul>
<li>A3 sheet will be provided</li>
<li>Participants must bring their own materials</li>
<li>Water colours and paints are not allowed</li>
<li>Gadgets are prohibited</li>
<li>References are prohibited</li>
<li>Pre-made sketches are prohibited</li>
<li>Tracing is prohibited</li>
<li>Artwork must be completed within 60 minutes</li>
</ul>
`
}

};

function openModal(event){

document.getElementById("modalTitle").innerHTML =
eventDetails[event].title;

document.getElementById("modalBody").innerHTML =
eventDetails[event].body;

document.getElementById("eventModal").style.display =
"block";
}

function closeModal(){
document.getElementById("eventModal").style.display =
"none";
}


function openModal(event){

document.getElementById("modalTitle").innerHTML =
eventDetails[event].title;

document.getElementById("modalBody").innerHTML =
eventDetails[event].body;

document.getElementById("eventModal").style.display =
"block";
}

function closeModal(){
document.getElementById("eventModal").style.display =
"none";
}

updateCountdown();

setInterval(updateCountdown,1000);


const starfield = document.getElementById("starfield");

for(let i=0;i<250;i++){

    const star = document.createElement("div");

    star.classList.add("star");

    const size = Math.random()*3 + 1;

    star.style.width = size + "px";
    star.style.height = size + "px";

    star.style.left = Math.random()*100 + "%";
    star.style.top = Math.random()*100 + "%";

    star.style.animationDelay =
    Math.random()*3 + "s";

    starfield.appendChild(star);
}

function toggleMenu(){
    document.getElementById("navLinks")
            .classList.toggle("show");
}


document.querySelectorAll("#navLinks a").forEach(link => {
    link.addEventListener("click", () => {
        document.getElementById("navLinks")
                .classList.remove("show");
    });
});

const navLinks = document.querySelectorAll("nav ul a");

navLinks.forEach(link => {
    link.addEventListener("click", () => {
        document.getElementById("navLinks").classList.remove("show");
    });
});
