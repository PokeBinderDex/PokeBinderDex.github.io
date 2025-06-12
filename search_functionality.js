// search_functionality.js
document.addEventListener('DOMContentLoaded', function () {
    console.log("✅ DOMContentLoaded : DOM chargé");
    initializeSearchBars();
});

function initializeSearchBars() {
    const searchContainers = document.querySelectorAll('.search-container');
    console.log("🔍 Nombre de search-container trouvés :", searchContainers.length);

    if (typeof allPokemon === 'undefined') {
        console.error("❌ Erreur : allPokemon n'est pas défini. Vérifie si pokemon_data.js est bien chargé.");
        return;
    } else {
        console.log("✅ allPokemon chargé avec", allPokemon.length, "Pokémon");
    }

    searchContainers.forEach((container, index) => {
        console.log(`➡️ Initialisation du container n°${index + 1}`);

        const searchInput = container.querySelector('.search-input');
        const suggestions = container.querySelector('.search-suggestions');
        const fullListBtn = container.querySelector('.fulllist-btn');
        const fullListDropdown = container.querySelector('.fulllist-dropdown');
        const fullListContent = container.querySelector('.fulllist-content');

        if (!searchInput || !suggestions || !fullListBtn || !fullListDropdown || !fullListContent) {
            console.warn("⚠️ Des éléments manquent dans le container :", container);
            return;
        }

        console.log("✅ Tous les éléments requis sont présents");

        // Initialiser le contenu FullList
        initializeFullList(fullListContent);
        console.log("📋 FullList initialisé");

        // Gestion de la recherche
        searchInput.addEventListener('input', function () {
            const query = this.value.trim().toLowerCase();
            console.log("🔎 Recherche : ", query);

            if (query.length > 0) {
                showSuggestions(suggestions, query);
            } else {
                hideSuggestions(suggestions);
            }
        });

        // Cacher les suggestions quand on clique ailleurs
        document.addEventListener('click', function (e) {
            if (!container.contains(e.target)) {
                hideSuggestions(suggestions);
                hideFullList(fullListBtn, fullListDropdown);
            }
        });

        // Gestion du menu FullList
        fullListBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            console.log("📋 Bouton FullList cliqué");
            toggleFullList(fullListBtn, fullListDropdown);
        });

        // Empêcher la fermeture du dropdown quand on clique dedans
        fullListDropdown.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    });
}

// Nouvelle fonction pour obtenir la génération d'un Pokémon
function getPokemonGeneration(pokemonName) {
    if (typeof pokemonDatabase === 'undefined') {
        console.warn("⚠️ pokemonDatabase n'est pas défini");
        return null;
    }
    
    for (const [generation, pokemonList] of Object.entries(pokemonDatabase)) {
        if (pokemonList.includes(pokemonName)) {
            // Extraire le numéro de génération (ex: "Génération 1" -> "Gen 1")
            const genNumber = generation.match(/\d+/);
            return genNumber ? `Gen ${genNumber[0]}` : generation;
        }
    }
    return null; // Pokémon non trouvé
}

function showSuggestions(suggestionsContainer, query) {
    const matches = allPokemon.filter(pokemon =>
        pokemon.toLowerCase().includes(query)
    ).slice(0, 5);

    console.log(`🔍 Suggestions pour "${query}" :`, matches);

    if (matches.length > 0) {
        suggestionsContainer.innerHTML = matches.map(pokemon => {
            const highlightedName = highlightMatch(pokemon, query);
            const generation = getPokemonGeneration(pokemon);
            const generationText = generation ? `<span class="suggestion-generation">${generation}</span>` : '';
            
            return `<div class="suggestion-item">
                        <span class="suggestion-name">${highlightedName}</span>
                        ${generationText}
                    </div>`;
        }).join('');

        suggestionsContainer.classList.add('active');
    } else {
        hideSuggestions(suggestionsContainer);
    }
}

function hideSuggestions(suggestionsContainer) {
    suggestionsContainer.classList.remove('active');
    suggestionsContainer.innerHTML = '';
}

function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="suggestion-highlight">$1</span>');
}

function initializeFullList(container) {
    const content = Object.entries(pokemonDatabase).map(([generation, pokemon]) => {
        const pokemonItems = pokemon.map(name =>
            `<li class="pokemon-item">${name}</li>`
        ).join('');
        console.log(`pokemon "${pokemonItems}", gen "${generation}" :`);
        return `
            <div class="generation-section">
                <div class="generation-title">${generation}</div>
                <ul class="pokemon-list">
                    ${pokemonItems}
                </ul>
            </div>
        `;
    }).join('');

    container.innerHTML = content;
    console.log("📘 FullList : contenu HTML inséré");
}

function toggleFullList(btn, dropdown) {
    const isActive = dropdown.classList.contains('active');
    console.log(`🔁 Toggle FullList : état précédent = ${isActive}`);
    
    if (isActive) {
        hideFullList(btn, dropdown);
    } else {
        showFullList(btn, dropdown);
    }
}

function showFullList(btn, dropdown) {
    btn.classList.add('active');
    dropdown.classList.add('active');
    console.log("✅ FullList affiché");
}

function hideFullList(btn, dropdown) {
    btn.classList.remove('active');
    dropdown.classList.remove('active');
    console.log("❎ FullList caché");
}