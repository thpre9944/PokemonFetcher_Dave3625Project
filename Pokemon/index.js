$(document).ready(function() {


$("#fetchButton").click(getPokemon);


//an asynchronus function to fetch pokemon api address, convert it to a json format and grab its attributes to display wanted information.
async function getPokemon(){
    try{
        const pokeName = document.getElementById('pokeName').value.toLowerCase(); //grab text inputs value to get wanted pokemon in fetch api address. 
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokeName}`); //needs to wait for the api to be fetched before continuing.

        if(!response.ok){ //important to address any writing mistakes to not get error report.
            throw new Error("Something went wrong, couldn't fetch! Check typo at Pokemon Name");
        }

        const data = await response.json(); //converts to a json file.

        const pokeSprite = data.sprites.other['official-artwork'].front_default; //sprite is the picture attribute in the json file. front_default is front picture of a pokémon.
        const imgElm = document.getElementById('pokeimg');

        imgElm.src = pokeSprite; //here the sprite is added to img source in the html to display the pokémon picture.
        imgElm.style.display = "block";

        $('.container').removeClass('hidden');//makes div class container visable.

        
        console.log(data);
        background();
        displayTextContent(data);
    }
    
    catch(error){
        console.error(error);
    }
};

// a function to display coresponding content as text from the json pokemon api.
function displayTextContent(data){

//  following 5 id's is for taking json attributes and add to text.
    const namePara = document.getElementById('name');
    namePara.textContent = `${data.name}`;

    //Takes weight to add to p element and converts it into kg.
    const weightPara = document.getElementById('weight');
    const weightConvert = data.weight / 10;
    weightPara.textContent = `Weight: ${weightConvert} kg`;

    const heightPara = document.getElementById('height');
    const heightConverter = data.height / 10;
    heightPara.textContent = `Height: ${heightConverter} m`;

    const expPara = document.getElementById('exp');
    expPara.textContent = `Experience: ${data.base_experience}`;

    const orderPara = document.getElementById('order');
    orderPara.textContent = `Order: ${data.order}`;
};

// setting a random background img.
function background(){
    let images = ['bilder/pokemon1', 'bilder/pokemon2', 'bilder/pokemon3', 'bilder/pokemon4', 'bilder/pokemon5']; // array of all pictures in bilder folder.
    let randomNumber = Math.floor(Math.random()*images.length); // selects a random number between 0 and images' length.
    bgImg = 'url(' + images[randomNumber] + '.jpg)'; //selects the content from images array that fits that number and makes it to a url string.

    $('.card-img').css({'background': bgImg, 'background-size':'cover','background-position':'center'}); //styles the image to css.
};


$('#removeButton').click(function(){
    // Reset image
    const imgElm = document.getElementById('pokeimg');
    imgElm.src = '';  // Clear the image
    imgElm.style.display = "none";  // Hide the image

    $('.container').addClass('hidden');

    // Reset text content
    document.getElementById('name').textContent = '';  // Clear name
    document.getElementById('weight').textContent = '';  // Clear weight
    document.getElementById('height').textContent = '';  // Clear height
    document.getElementById('exp').textContent = '';  // Clear experience
    document.getElementById('order').textContent = '';  // Clear order

    // Reset input field
    document.getElementById('pokeName').value = '';  // Clear input field
});


});