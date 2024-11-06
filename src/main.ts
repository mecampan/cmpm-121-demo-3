import "./style.css";

//const app: HTMLDivElement = document.querySelector("#app")!;
const gameName = "GeoCoin Game";
document.title = gameName;

const messageButton = document.createElement("button");
messageButton.textContent = "Push the button.";

messageButton.addEventListener("click", () => {
  alert("You clicked the button!");
});

document.body.appendChild(messageButton);
