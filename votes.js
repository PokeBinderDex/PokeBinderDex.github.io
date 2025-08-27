// Configuration du Space Hugging Face
const SPACE_ID = 'leonheart2B/votes';

// Définition du gradient Pokémon pour le CSS
const POKEMON_GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

// Variables globales pour le client Gradio
let gradioClient = null;

// Données des cartes avec chemins d'images (maintenant avec plusieurs images possibles)
const pokemonCards = [
    { 
        id: 1, 
        name: "Charizard Ex & cie", 
        set: "151", 
        cardImgs: ["assets/votes/charizard-ex.png", "assets/votes/charmeleon.png", "assets/votes/charmander.png"], 
        setImg: "assets/votes/151-logo.png" 
    },
    { 
        id: 2, 
        name: "Blastoise Ex", 
        set: "151", 
        cardImgs: ["assets/votes/blastoise-ex.png"], 
        setImg: "assets/votes/151-logo.png" 
    },
    { 
        id: 3, 
        name: "Venusaur Ex", 
        set: "151", 
        cardImgs: ["assets/votes/venusaur-ex.png"], 
        setImg: "assets/votes/151-logo.png" 
    },
    { 
        id: 4, 
        name: "Zapdos Ex", 
        set: "151", 
        cardImgs: ["assets/votes/zapdos-ex.png"], 
        setImg: "assets/votes/151-logo.png" 
    },
    { 
        id: 5, 
        name: "Alakazam Ex", 
        set: "151", 
        cardImgs: ["assets/votes/alakazam-ex.png"], 
        setImg: "assets/votes/151-logo.png" 
    },
    { 
        id: 6, 
        name: "Mew Ex", 
        set: "Paldean Fates", 
        cardImgs: ["assets/votes/mew-ex.png"], 
        setImg: "assets/votes/paldean-fates-logo.png" 
    },
    { 
        id: 7, 
        name: "Poliwhirl", 
        set: "151", 
        cardImgs: ["assets/votes/poliwhirl.png"], 
        setImg: "assets/votes/151-logo.png" 
    },
    { 
        id: 8, 
        name: "Gardevoir Ex", 
        set: "Paldean Fates", 
        cardImgs: ["assets/votes/gardevoir-ex.png"], 
        setImg: "assets/votes/paldean-fates-logo.png" 
    },
    { 
        id: 9, 
        name: "Eevee", 
        set: "Twilight Masquerade", 
        cardImgs: ["assets/votes/eevee.png"], 
        setImg: "assets/votes/twilight-masquerade-logo.png" 
    },
    { 
        id: 10, 
        name: "Chansey", 
        set: "Twilight Masquerade", 
        cardImgs: ["assets/votes/chansey.png"], 
        setImg: "assets/votes/twilight-masquerade-logo.png" 
    },
    { 
        id: 11, 
        name: "Bulbasaur", 
        set: "Stellar Crown", 
        cardImgs: ["assets/votes/bulbasaur.png"], 
        setImg: "assets/votes/stellar-crown-logo.png" 
    },
    { 
        id: 12, 
        name: "Squirtle", 
        set: "Stellar Crown", 
        cardImgs: ["assets/votes/squirtle.png"], 
        setImg: "assets/votes/stellar-crown-logo.png" 
    },
    { 
        id: 13, 
        name: "Latios & Latias", 
        set: "Surging Spark", 
        cardImgs: ["assets/votes/latios.png", "assets/votes/latias.png"], 
        setImg: "assets/votes/surging-sparks-logo.png" 
    },
    { 
        id: 14, 
        name: "N's Reshiram", 
        set: "Journey Together", 
        cardImgs: ["assets/votes/ns-reshiram.png"], 
        setImg: "assets/votes/journey-together-logo.png" 
    },
    { 
        id: 15, 
        name: "Cleffa", 
        set: "Obsidian Flames", 
        cardImgs: ["assets/votes/cleffa.png"], 
        setImg: "assets/votes/obsidian-flames-logo.png" 
    }
];

let selectedCard = null;
let hasVoted = false;

// Variables CSS pour les couleurs
const CSS_VARS = {
    primaryBlue: '#3d7dca',
    primaryYellow: '#ffcb05'
};

// Initialiser le client Gradio
async function initGradioClient() {
    if (!gradioClient) {
        try {
            console.log('🔄 Connexion au Space Gradio...');
            const { Client } = await import("https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.js");
            gradioClient = await Client.connect(SPACE_ID);
            console.log("✅ Client Gradio connecté à", SPACE_ID);
        } catch (error) {
            console.error("❌ Erreur connexion Gradio:", error);
            throw error;
        }
    }
    return gradioClient;
}

// Générer les cartes
function generateCards() {
    const cardGrid = document.getElementById('cardGrid');
    if (!cardGrid) {
        console.error('Element cardGrid not found');
        return;
    }
    
    cardGrid.innerHTML = '';

    pokemonCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card-option';
        cardElement.dataset.cardId = card.id;
        
        // Créer le carousel d'images si plusieurs images
        let imageContent = '';
        if (card.cardImgs.length > 1) {
            imageContent = `
                <div class="card-image-carousel">
                    <div class="carousel-container" data-card-id="${card.id}">
                        ${card.cardImgs.map((img, index) => `
                            <img src="${img}" alt="${card.name} variant ${index + 1}" 
                                 class="carousel-image ${index === 0 ? 'active' : ''}" 
                                 onerror="this.style.display='none';">
                        `).join('')}
                    </div>
                    <div class="carousel-indicators">
                        ${card.cardImgs.map((_, index) => `
                            <span class="indicator ${index === 0 ? 'active' : ''}" 
                                  onclick="showImage(${card.id}, ${index})"></span>
                        `).join('')}
                    </div>
                    <div class="carousel-controls">
                        <button class="carousel-btn prev" onclick="prevImage(${card.id})" type="button">‹</button>
                        <button class="carousel-btn next" onclick="nextImage(${card.id})" type="button">›</button>
                    </div>
                    <div class="image-counter">
                        <span class="current-image">1</span>/<span class="total-images">${card.cardImgs.length}</span>
                    </div>
                </div>
            `;
        } else {
            imageContent = `
                <div class="card-image-carousel">
                    <div class="carousel-container">
                        <img src="${card.cardImgs[0]}" alt="${card.name}" class="carousel-image active" onerror="this.style.display='none'; this.parentNode.innerHTML='🎴';">
                    </div>
                </div>
            `;
        }
        
        cardElement.innerHTML = `
            <div class="card-content">
                ${imageContent}
                <div class="card-name">${card.name}</div>
                <div class="card-set">
                    <div class="set-logo">
                        <img src="${card.setImg}" alt="${card.set}" onerror="this.style.display='none'; this.parentNode.innerHTML='⭐';">
                    </div>
                </div>
            </div>
        `;

        cardElement.addEventListener('click', (e) => {
            // Empêcher la sélection si on clique sur les contrôles du carousel
            if (!e.target.closest('.carousel-btn') && !e.target.closest('.indicator')) {
                selectCard(card.id);
            }
        });
        cardGrid.appendChild(cardElement);
    });
}

// Fonctions pour le carousel d'images
function showImage(cardId, imageIndex) {
    const carousel = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!carousel) return;
    
    const images = carousel.querySelectorAll('.carousel-image');
    const indicators = carousel.closest('.card-option').querySelectorAll('.indicator');
    const counter = carousel.closest('.card-option').querySelector('.current-image');
    
    // Masquer toutes les images et désactiver tous les indicateurs
    images.forEach(img => img.classList.remove('active'));
    indicators.forEach(ind => ind.classList.remove('active'));
    
    // Afficher l'image sélectionnée et activer l'indicateur correspondant
    if (images[imageIndex]) {
        images[imageIndex].classList.add('active');
        indicators[imageIndex].classList.add('active');
        if (counter) counter.textContent = imageIndex + 1;
    }
}

function nextImage(cardId) {
    const carousel = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!carousel) return;
    
    const images = carousel.querySelectorAll('.carousel-image');
    const currentIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
    const nextIndex = (currentIndex + 1) % images.length;
    
    showImage(cardId, nextIndex);
}

function prevImage(cardId) {
    const carousel = document.querySelector(`[data-card-id="${cardId}"]`);
    if (!carousel) return;
    
    const images = carousel.querySelectorAll('.carousel-image');
    const currentIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    
    showImage(cardId, prevIndex);
}

// Sélectionner une carte
function selectCard(cardId) {
    if (hasVoted) return;

    // Retirer la sélection précédente
    document.querySelectorAll('.card-option').forEach(el => {
        el.classList.remove('selected');
    });

    // Sélectionner la nouvelle carte
    const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
    if (cardElement) {
        cardElement.classList.add('selected');
        selectedCard = cardId;

        // Activer le bouton de vote
        const voteButton = document.getElementById('voteButton');
        if (voteButton) {
            voteButton.disabled = false;
            const cardName = pokemonCards.find(c => c.id === cardId)?.name || 'cette carte';
            voteButton.textContent = `🗳️ VOTE FOR ${cardName.toUpperCase()} !`;
        }
    }
}

// Afficher un message
function showMessage(text, type = 'success') {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    
    messageDiv.innerHTML = `<div class="message ${type}">${text}</div>`;
    
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 8000);
    }
}

// Voter - VERSION CLIENT GRADIO
async function vote() {
    if (!selectedCard) {
        showMessage('⚠️ Select a card before voting !', 'error');
        return;
    }

    if (hasVoted) {
        showMessage('❌ You already voted !', 'error');
        return;
    }

    const commentInput = document.getElementById('commentInput');
    const comment = commentInput ? commentInput.value : '';
    const voteButton = document.getElementById('voteButton');
    
    try {
        // Désactiver le bouton
        if (voteButton) {
            voteButton.disabled = true;
            voteButton.textContent = '⏳ Voting ...';
        }
        
        showMessage('🗳️ Sending your vote...', 'success');

        // S'assurer que le client est connecté
        const client = await initGradioClient();

        // Appel via le client Gradio (comme votre scanner)
        console.log('📤 Envoi du vote:', { selectedCard, comment });
        const result = await client.predict("/vote_for_option", { 
            option_id: selectedCard,
            comment: comment
        });

        console.log('📥 Réponse reçue:', result);

        if (result && result.data && result.data.length > 0) {
            const message = result.data[0];
            
            if (message.includes('✅')) {
                hasVoted = true;
                showMessage(message, 'success');
                
                // Désactiver toutes les cartes
                document.querySelectorAll('.card-option').forEach(el => {
                    el.style.opacity = '0.6';
                    el.style.pointerEvents = 'none';
                });
                
                if (voteButton) {
                    voteButton.textContent = '✅ VOTE SAVED, PROMO : WELCOMEDEX5';
                    voteButton.style.background = '#28a745';
                }
                
                // Actualiser les résultats
                setTimeout(loadResults, 2000);
            } else {
                showMessage(message, 'error');
                if (voteButton) {
                    voteButton.disabled = false;
                    const cardName = pokemonCards.find(c => c.id === selectedCard)?.name || 'cette carte';
                    voteButton.textContent = `🗳️ VOTER POUR ${cardName.toUpperCase()} !`;
                }
            }
        } else {
            throw new Error('Server error');
        }

    } catch (error) {
        console.error('❌ Erreur lors du vote:', error);
        showMessage(`❌ Error: ${error.message || 'Connexion issue'}`, 'error');
        
        if (voteButton) {
            voteButton.disabled = false;
            if (selectedCard) {
                const cardName = pokemonCards.find(c => c.id === selectedCard)?.name || 'cette carte';
                voteButton.textContent = `🗳️ VOTER FOR ${cardName.toUpperCase()} !`;
            } else {
                voteButton.textContent = '🗳️ VOTER FOR THIS CARD !';
            }
        }
    }
}

// Charger les résultats - VERSION CLIENT GRADIO
async function loadResults() {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;
    
    try {
        resultsDiv.innerHTML = '<div class="loading"> Charging results...</div>';
        
        // S'assurer que le client est connecté
        const client = await initGradioClient();

        // Appel via le client Gradio
        console.log('📤 Demande des résultats JSON...');
        const result = await client.predict("/get_results_json", {});

        console.log('📥 Résultats reçus:', result);

        if (result && result.data && result.data.length > 0) {
            const jsonData = JSON.parse(result.data[0]);
            displayResults(jsonData);
        } else {
            throw new Error('no results');
        }

    } catch (error) {
        console.error('❌ Erreur lors du chargement des résultats:', error);
        resultsDiv.innerHTML = 
            `<div class="message error">⚠️ Error: ${error.message || 'Connexion Issue'}`;
    }
}

// Afficher les résultats
function displayResults(data) {
    const resultsDiv = document.getElementById('results');
    const totalVotesDiv = document.getElementById('totalVotes');
    
    if (!resultsDiv) return;
    
    if (data.error) {
        resultsDiv.innerHTML = `<div class="message error">❌ Erreur: ${data.error}</div>`;
        return;
    }

    // Convertir et trier les résultats
    const resultsArray = Object.values(data.results || {}).sort((a, b) => b.votes - a.votes);
    
    if (resultsArray.length === 0) {
        resultsDiv.innerHTML = '<div class="loading">No votes currently...</div>';
        if (totalVotesDiv) totalVotesDiv.innerHTML = '🗳️ Total: 0 votes';
        return;
    }
    
    let resultsHTML = '';
    
    resultsArray.forEach((result, index) => {
        const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        
        resultsHTML += `
            <div class="result-item">
                <div class="result-header">
                    <div class="result-name">${result.name || 'Unknown card'}</div>
                    <div class="result-rank ${rankClass}">${rankEmoji}</div>
                </div>
                <div class="result-bar">
                    <div class="result-progress" style="width: ${result.percentage || 0}%"></div>
                </div>
                <div class="result-stats">
                    <span>${result.votes || 0} votes</span>
                    <span>${result.percentage || 0}%</span>
                </div>
            </div>
        `;
    });
    
    resultsDiv.innerHTML = resultsHTML;
    
    if (totalVotesDiv) {
        totalVotesDiv.innerHTML = `🗳️ Total: ${data.total_votes || 0} votes`;
    }
}

// Gestion des événements
function initializeEventListeners() {
    // Bouton de vote
    const voteButton = document.getElementById('voteButton');
    if (voteButton) {
        voteButton.addEventListener('click', vote);
    }

    // Bouton de rafraîchissement
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', loadResults);
    }
}

// Initialisation quand le DOM est chargé
async function initialize() {
    console.log('🚀 Initialisation du système de vote Pokémon...');
    
    try {
        // Ajouter les variables CSS si elles n'existent pas
        const root = document.documentElement;
        root.style.setProperty('--pokemon-gradient', POKEMON_GRADIENT);
        root.style.setProperty('--primary-blue', CSS_VARS.primaryBlue);
        root.style.setProperty('--primary-yellow', CSS_VARS.primaryYellow);
        
        // Initialiser le client Gradio
        await initGradioClient();
        
        // Générer les cartes
        generateCards();
        
        // Initialiser les événements
        initializeEventListeners();
        
        // Charger les résultats
        loadResults();
        
        // Actualiser les résultats toutes les 30 secondes
        setInterval(loadResults, 30000);
        
        console.log('✅ Système de vote initialisé avec succès !');
    } catch (error) {
        console.error('❌ Échec d\'initialisation:', error);
        showMessage(`❌ Erreur d'initialisation: ${error.message}`, 'error');
    }
}

// Auto-initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Export des fonctions pour usage externe si nécessaire
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateCards,
        selectCard,
        vote,
        loadResults,
        displayResults,
        pokemonCards,
        showImage,
        nextImage,
        prevImage,
        initGradioClient
    };
}
