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

// Fonction pour obtenir les lettres du Pokémon et déterminer le bon bouton
function getPokemonButtonInfo(pokemonName) {
    const generation = getPokemonGeneration(pokemonName);
    if (!generation) return null;

    const firstLetter = pokemonName.charAt(0).toLowerCase();
    const genNumber = generation.match(/\d+/)[0];
    
    // Définir les plages de lettres pour chaque génération
    const letterRanges = {
        '1': { 'A-E': 'a-e', 'G-P': 'g-p', 'R-V': 'r-v' },
        '2': { 'A-H': 'a-h', 'J-Q': 'j-q', 'S-W': 's-w' },
        '3': { 'A-G': 'a-g', 'J-M': 'j-m', 'R-T': 'r-t' },
        '4': { 'A-G': 'a-g', 'I-P': 'i-p', 'R-W': 'r-w' },
        '5': { 'B-J': 'b-j', 'K-R': 'k-r', 'S-Z': 's-z' },
        '6': { 'A-G': 'a-g', 'H-P': 'h-p', 'S-Z': 's-z' },
        '7': { 'B-L': 'b-l', 'M-R': 'm-r', 'S-V': 's-v' },
        '8': { 'A-F': 'a-f', 'G-O': 'g-o', 'R-Z': 'r-z' }
    };

    const ranges = letterRanges[genNumber];
    if (!ranges) return null;

    for (const [buttonText, range] of Object.entries(ranges)) {
        const [start, end] = range.split('-');
        if (firstLetter >= start && firstLetter <= end) {
            return {
                generation: genNumber,
                buttonText: buttonText
            };
        }
    }
    
    return null;
}

// Fonction pour scroller horizontalement vers la génération et mettre en évidence le bouton
function scrollToGenerationAndHighlightButton(pokemonName) {
    const buttonInfo = getPokemonButtonInfo(pokemonName);
    if (!buttonInfo) return;

    // Trouver le container de scroll horizontal
    const scrollContainer = document.querySelector('.scroll-container');
    if (!scrollContainer) {
        console.warn("❌ Container de scroll non trouvé");
        return;
    }

    // Trouver la carte de génération cible
    const productCards = document.querySelectorAll('.product-card');
    let targetCard = null;

    productCards.forEach(card => {
        const title = card.querySelector('.product-title');
        if (title && title.textContent.trim() === `Gen ${buttonInfo.generation}`) {
            targetCard = card;
        }
    });

    if (targetCard) {
        // Réinitialiser tous les boutons précédemment surlignés
        document.querySelectorAll('.buy-button.highlighted').forEach(btn => {
            btn.classList.remove('highlighted');
        });

        // Calculer la position pour centrer la carte dans le container
        const containerWidth = scrollContainer.clientWidth;
        const cardLeft = targetCard.offsetLeft;
        const cardWidth = targetCard.offsetWidth;
        
        // Position pour centrer la carte
        const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2);
        
        console.log(`🎯 Scroll vers Gen ${buttonInfo.generation} - Position: ${scrollPosition}px`);

        // Scroller horizontalement dans le container
        scrollContainer.scrollTo({
            left: Math.max(0, scrollPosition), // Éviter les valeurs négatives
            behavior: 'smooth'
        });

        // Attendre un peu que le scroll soit terminé puis mettre en évidence le bouton
        setTimeout(() => {
            const buttons = targetCard.querySelectorAll('.gen-button');
            buttons.forEach(button => {
                if (button.textContent.trim() === buttonInfo.buttonText) {
                    button.classList.add('highlighted');
                    console.log(`✨ Bouton ${buttonInfo.buttonText} de Gen ${buttonInfo.generation} mis en évidence`);
                }
            });
        }, 500);
    }
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
            
            return `<div class="suggestion-item" data-pokemon="${pokemon}">
                        <span class="suggestion-name">${highlightedName}</span>
                        ${generationText}
                    </div>`;
        }).join('');

        // Ajouter les gestionnaires d'événements pour les clics sur les suggestions
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', function() {
                const pokemonName = this.getAttribute('data-pokemon');
                console.log(`🎯 Suggestion cliquée : ${pokemonName}`);
                
                // Remplir l'input avec le nom du Pokémon
                const searchInput = suggestionsContainer.closest('.search-container').querySelector('.search-input');
                searchInput.value = pokemonName;
                
                // Cacher les suggestions
                hideSuggestions(suggestionsContainer);
                
                // Scroller vers la section et mettre en évidence le bouton
                scrollToGenerationAndHighlightButton(pokemonName);
            });
        });

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
            `<li class="pokemon-item" data-pokemon="${name}">${name}</li>`
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
    
    // Ajouter les gestionnaires d'événements pour les clics dans la FullList
    container.querySelectorAll('.pokemon-item').forEach(item => {
        item.addEventListener('click', function() {
            const pokemonName = this.getAttribute('data-pokemon');
            console.log(`🎯 Pokémon sélectionné dans FullList : ${pokemonName}`);
            
            // Remplir l'input avec le nom du Pokémon
            const searchInput = document.querySelector('.search-input');
            searchInput.value = pokemonName;
            
            // Cacher la FullList
            const fullListBtn = document.querySelector('.fulllist-btn');
            const fullListDropdown = document.querySelector('.fulllist-dropdown');
            hideFullList(fullListBtn, fullListDropdown);
            
            // Scroller vers la section et mettre en évidence le bouton
            scrollToGenerationAndHighlightButton(pokemonName);
        });
    });
    
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
