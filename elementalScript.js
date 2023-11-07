// Course: SENG 513 
// Date: Oct 31, 2023 
// Assignment 3
// Name: Katherine Knauss 
// UCID: 30087243 


 // JavaScript code for game logic
 const cells = document.querySelectorAll('.cell');
 let currentPlayer = '1';
 let xBorderColor = 'red'; // Border color for player 1
 let oBorderColor = 'blue'; // Border color for player 2
 let previouslyPlayed = null;

 // Initialize imageClick to '1' (fire) for player 1
 let imageClick = '1';

 // Function to reset the cell click event listeners
 function resetCellClickListeners() {
     cells.forEach(cell => {
         cell.removeEventListener('click', handleCellClick); // Remove the old listener
         cell.addEventListener('click', handleCellClick); // Add a new listener
     });
 }

 // Call the function to set up the initial event listeners
 resetCellClickListeners();



 //button listeners
 const fireButton = document.getElementById('fire-button');
 const waterButton = document.getElementById('water-button');
 const earthButton = document.getElementById('earth-button');

 // buttons logic
 fireButton.addEventListener('click', () => {
     imageClick = '1';
 });

 waterButton.addEventListener('click', () => {
     imageClick = '2';
 });

 earthButton.addEventListener('click', () => {
     imageClick = '3';
 });


 function handleCellClick() {
     const cell = this; // 'this' refers to the clicked cell
         // Get the current player's element
         const currentPlayerElement = imageClick === '1' ? 'fire' : (imageClick === '2' ? 'water' : (imageClick === '3' ? 'earth' : ''));

         if(canPlaceToken(currentPlayerElement, cell)) {
             cell.innerHTML = `<div class="img-container"><img src="./pictures/${currentPlayerElement}.jpg" alt="Player ${currentPlayer}" style="border: 5px solid ${currentPlayer === '1' ? xBorderColor : oBorderColor}">${currentPlayer}</div>`;
             previouslyPlayed = cell;

             // Check for a winner after each move
             if (checkForWinner()) {
             } else {
                 // Switch to the other player
                 currentPlayer = currentPlayer === '1' ? '2' : '1';
                 updatePlayerTurn();
                 resetCellClickListeners(); // Reset cell click listeners
             }
         }
 }

//checks if token is allowed to be played
 function canPlaceToken(currentPlayerElement, cell) {
     const playerCell = cell.textContent; // Get the element of the cell
     if (playerCell === '') {
         // The cell is empty, and any token can be placed on it
         return true;
     }
     const imageElement = cell.querySelector('img');
     const source = imageElement.getAttribute('src');

    //check if current cell was previously played to prevent loops
     if(!cell === previouslyPlayed)
     {
        //find element weaknesses
         if(source === './pictures/fire.jpg') {
             if(currentPlayerElement === 'water') {
                 return true;
             }
         }
         else if(source === './pictures/water.jpg') {
             if(currentPlayerElement === 'earth') {
                 return true;
             }
         }
         else if(source === './pictures/earth.jpg') {
             if(currentPlayerElement === 'fire') {
                 return true;
             }
         }   
         else {
             return false;
         }
     }
     else {
         return false;
     }
 }

 function checkForWinner() {
    //check for these winning combingations for a 5x5 grid
     const winningCombinations = [
         [0, 1, 2, 3, 4], [5,6,7,8,9], [10, 11,12,13,14], [15,16,17,18,19],[20, 21,22,23,24], // Rows
         [0, 5, 10,15,20], [1, 6, 11, 16,21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24], // Columns
         [0, 6, 12,18, 24], [4, 8, 12,16,20]           // Diagonals
         
     ];

    //check all five combinations
     for (const combo of winningCombinations) {
         const [a, b, c, d, e] = combo;
         
         if (cells[a].textContent === currentPlayer && cells[b].textContent === currentPlayer && cells[c].textContent === currentPlayer && cells[d].textContent === currentPlayer && cells[e].textContent === currentPlayer) {
             // Declare the current player as the winner
             const winnerModal = document.getElementById('winner-modal');
             const winnerPlayer = document.getElementById('winner-player');
             winnerPlayer.textContent = currentPlayer;
             winnerModal.style.display = 'block';
             return true;
         }
     }
     return false;
 }

 // Handle the exit button in the winner modal
 const exitButton = document.getElementById('exit-button');
 exitButton.addEventListener('click', () => {
     const winnerModal = document.getElementById('winner-modal');
     winnerModal.style.display = 'none';

     // Clear the board and reset the game
     clearBoard();
     currentPlayer = '1'; // Reset to player 1
     updatePlayerTurn();
 });

 // Function to clear the game board
 function clearBoard() {
     cells.forEach(cell => {
         cell.innerHTML = '';
     });
     console.log('Clear board');
 }

 // Function to update the player's turn 
 function updatePlayerTurn() {
     const playerTurnElement = document.getElementById('player-turn');
     playerTurnElement.textContent = currentPlayer;
     playerTurnElement.style.color = currentPlayer === '1' ? 'red' : 'blue';
 }

 //instructions modal code
 const instructionButton = document.querySelector('.btn-grad-dark');
 const modal = document.getElementById('modal');
 const closeBtn = document.getElementById('close-btn');

 instructionButton.addEventListener('click', () => {
     modal.style.display = 'block';
 });

 closeBtn.addEventListener('click', () => {
     modal.style.display = 'none';
 });

 // Close the modal if the user clicks outside the content
 window.addEventListener('click', (e) => {
     if (e.target === modal) {
         modal.style.display = 'none';
     }
 });

