// pokemon_data.js - Base de données des Pokémon pour la recherche
const pokemonDatabase = {
  "Generation 1": [
    "Arcanine", "Blastoise", "Bulbasaur", "Charizard", "Charmander",
    "Ditto", "Dragonair", "Dragonite", "Eevee",

    "Gengar", "Lapras", "Magnemite", "Mewtwo", "Nidoking", "Ninetales",
    "Pikachu", "Pinsir", "Porygon", "Psyduck", 
    
    "Raichu", "Slowpoke", "Snorlax", "Squirtle", "Vaporeon", "Venusaur", "Vulpix"
  ],
  "Generation 2": [
    "Ampharos", "Celebi", "Chikorita", "Crobat", "Cyndaquil",
    "Entei", "Espeon", "Feraligatr", "Furret", "Heracross", "Houndoom", "Ho-Oh", 
    
    "Jolteon", "Kingdra", "Lugia",
    "Misdreavus", "Pichu", "Porygon2", "Quagsire", "Quilava",

    "Scizor", "Shuckle", "Suicune", "Togepi", "Totodile",
    "Tyranitar", "Typhlosion", "Umbreon", "Wobbuffet", "Wooper"
  ],
  "Generation 3": [
    "Absol", "Aggron", "Altaria", "Aron", "Banette",
    "Blaziken", "Breloom", "Deoxys", "Flygon", "Gardevoir",
     "Groudon", "Grovyle", 
     
     "Jirachi", "Kyogre", "Latias",
    "Latios", "Ludicolo", "Mawile", "Metagross", "Milotic",
    "Mudkip", 
    
    "Rayquaza", "Sableye", "Salamence", "Sceptile",
    "Swampert", "Torchic", "Treecko", "Tropius"
  ],
  "Generation 4": [
    "Arceus", "Bidoof", "Darkrai", "Dialga", "Empoleon",
    "Froslass", "Gallade", "Garchomp", "Giratina", "Glaceon", "Gliscor",

    "Infernape", "Leafeon", "Lucario", "Lopunny", "Luxray",
    "Mismagius", "Munchlax", "Pachirisu", "Piplup", "Porygon-Z", "Prinplup",

    "Rampardos", "Roserade", "Rotom", "Shaymin", "Shinx",
    "Staraptor", "Togekiss", "Torterra", "Turtwig", "Weavile"
  ],
  "Generation 5": [
    "Bisharp", "Chandelure", "Cinccino", "Emolga", "Excadrill",
    "Genesect", "Golurk", "Haxorus", "Hydreigon", "Joltik",

    "Keldeo", "Krookodile", "Kyurem", "Lilligant", "Litwick",
    "Meloetta", "Minccino", "Oshawott", "Reuniclus", "Reshiram",

    "Samurott", "Scolipede", "Serperior", "Snivy", "Tepig",
    "Victini", "Volcarona", "Whimsicott", "Zekrom", "Zoroark", "Zorua"
  ],
  "Generation 6": [
    "Aegislash", "Braixen", "Delphox", "Dedenne", "Diancie",
    "Espurr", "Fennekin", "Froakie", "Goomy",
    "Goodra", "Greninja",
    
    "Hawlucha", "Heliolisk", "Hoopa",
    "Malamar", "Meowstic", "Noivern", "Pancham",
    "Phantump", "Pyroar", 
    
    "Sylveon", "Talonflame",
    "Trevenant", "Xerneas", "Yveltal", "Zygarde"
  ],
  "Generation 7": [
    "Bewear", "Buzzwole", "Cosmog", "Crabominable", "Decidueye",
    "Golisopod", "Incineroar", "Kommo-o", "Litten", "Lunala",
    "Lurantis", "Lycanroc",
    
    "Marshadow", "Mimikyu", "Mudsdale",
    "Necrozma", "Ribombee", "Rockruff", "Rowlet",

    "Salazzle", "Solgaleo", "Togedemaru", "Toxapex", "Tsareena", "Vikavolt"
  ],
  "Generation 8": [
    "Alcremie", "Cinderace", "Centiskorch", "Cramorant", "Corviknight",
    "Dragapult", "Eiscue", "Eternatus", "Falinks",
    "Frosmoth", 
    
    "Grimmsnarl", "Grookey", "Hatterene", "Inteleon",
    "Melmetal", "Meltan", "Morpeko", "Obstagoon",

    "Rillaboom", "Scorbunny", "Toxtricity", "Zacian", "Zamazenta"
  ]
};


// Liste plate de tous les Pokémon pour la recherche
const allPokemon = Object.values(pokemonDatabase).flat();
