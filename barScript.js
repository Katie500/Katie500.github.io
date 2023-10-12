

function handleClick(e) {
    e.preventDefault();
    const bars = document.querySelectorAll(".bar");
    bars.forEach((bar, i) => {
        bar.style.animationPlayState = "running";
    });
    const lastBar = bars[bars.length-1];
    lastBar.addEventListener("animationend", () => {
        setTimeout(() => {
            window.location = e.target.href;
        }, 500);
    });
}