const questionContainer = document.getElementById("question-container");
let shuffledQuestions, currentQuestionIndex = 0;
let currentPlayer, currentScore = 0;
// Allow browser to remove localStorage after refresh
window.onbeforeunload = function (e) {
  localStorage.clear();
};

function loadQuestion() {
  fetch("http://127.0.0.1:3000/questions")
    .then(response => response.json())
    .then(data => {
      const questions = data;
      // Randomly select 10 questions to show
      shuffledQuestions = questions.sort(() => Math.random() - 0.5).slice(0, 10);
      setNextQuestion(shuffledQuestions, currentQuestionIndex);
    })
    .catch(err => console.log(err.message));
}

// Increment question index and show next question
function setNextQuestion() {
  resetState();
  showQuestion(shuffledQuestions[currentQuestionIndex]);
  currentQuestionIndex++;
}

// Remove all questionContainer's children
function resetState() {
  while (questionContainer.firstChild) {
    questionContainer.firstChild.removeEventListener("click", selectOption);
    questionContainer.removeChild(questionContainer.firstChild);
  }
}

function showQuestion(question) {
  // Create left card
  const leftOption = document.createElement("div");
  leftOption.setAttribute("class", "card");
  leftOption.setAttribute("Id", "left-option");
  leftOption.innerText = question.leftOption;
  questionContainer.appendChild(leftOption);

  // Create right card
  const rightOption = document.createElement("div");
  rightOption.setAttribute("class", "card");
  rightOption.setAttribute("Id", "right-option");
  rightOption.innerText = question.rightOption;
  questionContainer.appendChild(rightOption);

  // Add eventlistener
  const select = selectOption.bind(question);
  leftOption.addEventListener("click", select, {once: true});
  rightOption.addEventListener("click", select, {once: true});
  questionContainer.addEventListener("click", preventClick.bind(select));
}

// Prevent click on the sibling after selection
function preventClick() {
  Array.from(questionContainer.children).forEach(card => {
    card.removeEventListener("click", this);
  });
}

function selectOption(e) {
  const selected = e.target;
  selected.classList.add("selected");

  // Save selection in local storage
  localStorage.setItem(`Question_${currentQuestionIndex}`, selected.innerText);

  // Calculate score
  if (selected.innerText === this.correctOption) {
    currentScore += 10;
    console.log(currentScore);
  }

  // Construct data to be submitted to the server
  let correct = {
    numCorrect: this.numCorrect + 1,
    numIncorrect: this.numIncorrect
  }

  let incorrect = {
    numIncorrect: this.numIncorrect + 1,
    numCorrect: this.numCorrect
  }

  let data = selected.innerText === this.correctOption ? correct : incorrect;

  // Update selection to the server with PATCH request
  fetch(`http://127.0.0.1:3000/questions/${this.id}`, {
    method: "PATCH",
    headers: {
	     "Content-Type": "application/json",
	     "Accept": "application/json"
     },
    body: JSON.stringify(data)
  })
  .catch(err => console.log(err));

  // Display statistics
  let correctPercentage = Math.round(this.numCorrect / (this.numCorrect + this.numIncorrect) * 100);
  Array.from(questionContainer.children).forEach(card => {
    const content = document.createElement("div");
    content.setAttribute("class", "content");
    card.appendChild(content);
    if (card.innerText === this.correctOption) {
      card.classList.add("correct");
      content.innerText = `${correctPercentage}%`;
    } else {
      card.classList.add("incorrect")
      content.innerText = `${100 - correctPercentage}%`;
    }
  })

  // Proceed to next question
  if (currentQuestionIndex < shuffledQuestions.length) {
    setTimeout(() => setNextQuestion(), 2000);
  } else {
    setTimeout(() => askPlayerName(), 2000);
  }
}

function displayScore() {
  if (currentScore > 50) {
    return `We have <span>${currentScore}%</span> overlap of interest! We have so much to talk about!`
  } else {
    return `We have <span>${currentScore}%</span> overlap of interest! As if we are completely different people!`
  }
}


function askPlayerName() {
  resetState();

  // Create a wrapper
  const wrapper = document.createElement('div');
  wrapper.setAttribute("class", "form__group");

  // Create a greeting
  const greeting = document.createElement('h2');
  greeting.innerHTML = displayScore();

  // Generate a form
  const form = document.createElement("form");
  form.setAttribute("method", "post");
  form.setAttribute("action", "submit.php");

  // Create an input element for Name
  const name = document.createElement("input");
  name.setAttribute("type", "text");
  name.setAttribute("name", "name");
  name.setAttribute("id", "name");
  name.setAttribute("class", "form__field");
  name.setAttribute("placeholder", "Leave a name?");
  name.setAttribute("autocomplete", "off");

  // Create an input label
  const label = document.createElement("label");
  label.setAttribute("for", "name");
  label.setAttribute("class", "form__label");
  label.innerHTML = "PRESS ENTER"

  // Append the input element to the form
  form.append(name);
  form.append(label);

  // Append the greeting and form the to the wrapper
  wrapper.appendChild(greeting);
  wrapper.appendChild(form);

  // Append the wrapper to the document body;
  document.body.appendChild(wrapper);

  // Add eventlistener
  form.addEventListener("submit", submitPlayerName);
}


function submitPlayerName(e) {
  e.preventDefault();

  // Postprocess name string
  currentPlayer = new FormData(this).get("name");
  currentPlayer = currentPlayer.replace(/[^a-zA-Z0-9 ]/g, "").trim();

  // Construct submit data
  const formData = {
    name: currentPlayer,
    score: currentScore
  }

  // Save player name and score in local storage
  localStorage.setItem("name", currentPlayer);
  localStorage.setItem("score", currentScore);

  // Send player name and score to the server with POST request
  fetch("http://127.0.0.1:3000/players", {
    method: "POST",
    headers: {
	     "Content-Type": "application/json",
	     "Accept": "application/json"
     },
    body: JSON.stringify(formData)
  })
  .then(response => response.json())
  .then(json => {
    if (json.id) {
      // Display player if player is successfully created
      localStorage.setItem("id", json.id);
      displayPlayers(currentPlayer);
    } else {
      // Show error
      document.querySelector("label").innerText = json;
    }
  });
}


function displayPlayers(currentPlayer) {
  document.body.innerHTML = "";

  // Create a list of Top 10 players
  const list = document.createElement("div");
  list.setAttribute("class", "center");

  const title = document.createElement("h1");
  title.innerText = "Top 10";
  list.appendChild(title);
  document.body.appendChild(list);

  fetch("http://127.0.0.1:3000/players")
  .then(response => response.json())
  .then(data => {
    const top10 = data.sort((a, b) => b.score - a.score).slice(0, 10);

    for (const player of top10) {
      // Generate a scoreBar for each player
      const result = document.createElement("div");
      result.setAttribute("class", "result")
      const playerName = document.createElement("p");
      playerName.innerText = player.name;
      playerName.addEventListener("click", showPlayer);
      const playerScore = document.createElement("p");
      playerScore.innerHTML = player.score;
      const scoreBar = document.createElement("div");
      scoreBar.setAttribute("class", "scoreBar");
      const barLength = document.createElement("div");
      barLength.setAttribute("class", "barLength");
      barLength.setAttribute("style", `width: ${player.score}%`)
      scoreBar.appendChild(barLength);
      result.appendChild(playerName);
      result.appendChild(playerScore);
      result.appendChild(scoreBar);

      // Highlight currentPlayer's score
      if (player.name === currentPlayer) {
        result.classList.add("highlight");
        playerName.setAttribute("Id", "currentPlayer");
      }
      // Append each scoreBar to the document
      list.appendChild(result);
    }

    // if Top 10 doesn't include currentPlayer, append at the end
    if (!top10.find(player => player.name === currentPlayer)) {
      const result = document.createElement("div");
      result.setAttribute("class", "result highlight")
      result.classList.add("highlight");
      const playerName = document.createElement("p");
      playerName.innerText = currentPlayer;
      playerName.setAttribute("Id", "currentPlayer");
      playerName.addEventListener("click", showPlayer);
      const playerScore = document.createElement("p");
      playerScore.innerHTML = currentScore;
      const scoreBar = document.createElement("div");
      scoreBar.setAttribute("class", "scoreBar");
      const barLength = document.createElement("div");
      barLength.setAttribute("class", "barLength");
      barLength.setAttribute("style", `width: ${currentScore}%`)
      scoreBar.appendChild(barLength);
      result.appendChild(playerName);
      result.appendChild(playerScore);
      result.appendChild(scoreBar);
      list.appendChild(result);
    }
  });

  // Create a sidebar
  const sidebar = document.createElement("div");
  sidebar.setAttribute("id", "sidebar");
  document.body.appendChild(sidebar);

  // Generate a comment box
  const form = document.createElement("form");
  form.setAttribute("method", "post");
  form.setAttribute("action", "submit.php");
  form.setAttribute("id", "commentBox");

  // Create a textarea inside the comment box
  const content = document.createElement("textarea");
  content.setAttribute("name", "content");
  content.setAttribute("id", "content");
  content.setAttribute("placeholder", "Leave a comment?");
  content.setAttribute("autocomplete", "off");

  // Create submit button
  const submit = document.createElement("input");
  submit.setAttribute("type", "submit");
  submit.setAttribute("id", "submit");

  // Append the textarea and submit button to the form
  form.append(content);
  form.append(submit);

  // Add eventlistener
  form.addEventListener("submit", submitComment);

  // Append the comment box to the sidebar;
  document.body.appendChild(form);
}

// Show each player's comments
function showPlayer(e) {
  const playerName = e.target.innerText;
  if (e.target.classList.contains("on")) {
    e.target.classList.remove("on");
    const comment = document.getElementById(playerName);
    if (comment) {
      comment.remove();
    }
  } else {
    e.target.classList.add("on");
    const sidebar = document.getElementById("sidebar");

    fetch(`http://127.0.0.1:3000/players/${playerName}/comments`)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        for (const comment of data) {
          const commentBox = document.createElement("blockquote");
          commentBox.setAttribute("Id", playerName);
          commentBox.innerText = comment.content;
          sidebar.appendChild(commentBox);
        }
      })
      .catch(err => console.log(err.message));
  }
}

function submitComment(e) {
  e.preventDefault();

  let currentPlayerId = localStorage.getItem("id");
  let comment = new FormData(this).get("content").trim();

  // Construct data to be submitted to the server
  let formData = {
    player_id: currentPlayerId,
    content: comment
  }
  // Create a comment for the currentPlayer through POST request
  fetch(`http://127.0.0.1:3000/players/${currentPlayerId}/comments`, {
    method: "POST",
    headers: {
	     "Content-Type": "application/json",
	     "Accept": "application/json"
     },
    body: JSON.stringify(formData)
  })
  .then(response => response.json())
  .then(comment => {
    if (comment.content) {
      // Create comment box if comment passes validation
      const commentBox = document.createElement("blockquote");
      commentBox.innerText = comment.content;
      commentBox.setAttribute("Id", currentPlayer);
      localStorage.setItem("comment", comment.content);
      const sidebar = document.getElementById("sidebar");
      sidebar.appendChild(commentBox);
      document.getElementById("currentPlayer").classList.add("on");
      document.getElementById("commentBox").remove();
    } else {
      // Show error
      document.querySelector("textarea").setAttribute("placeholder", comment);
    }
  })
}

document.addEventListener("DOMContentLoaded", function() {
  loadQuestion();
  //askPlayerName();
  //displayPlayers();
})
