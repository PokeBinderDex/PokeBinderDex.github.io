document.addEventListener('DOMContentLoaded', function() {
    const bandeau = document.querySelector('.bandeau');
    const content = document.querySelector('.bandeau-content');
    const images = content.querySelectorAll('img');
    
    // Wait for images to load
    function initBandeau() {
        // Calculate total width of first set of images (before duplication)
        const totalImages = images.length / 2; // Since images are duplicated
        let totalWidth = 0;
        for (let i = 0; i < totalImages; i++) {
            totalWidth += images[i].offsetWidth + 20; // width + margin
        }
        
        // Set animation duration based on width (adjust 100px for speed)
        const duration = Math.max(20, totalWidth / 100); 
        
        // Create keyframes dynamically
        const style = document.createElement('style');
        style.textContent = `
            @keyframes bandeauScroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-${totalWidth}px); }
            }
            .bandeau-content {
                animation: bandeauScroll ${duration}s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }
    
    // If all images are already loaded
    if (document.readyState === 'complete') {
        initBandeau();
    } else {
        window.addEventListener('load', initBandeau);
        // Fallback in case load event doesn't fire
        setTimeout(initBandeau, 3000);
    }
});

// Script pour la barre de navigation sticky
document.addEventListener('DOMContentLoaded', function() {
    const stickyNav = document.getElementById('stickyNav');
    const collectionOverview = document.querySelector('.collection-overview');
    
    // Fonction pour vérifier si on a dépassé la section overview
    function checkScrollPosition() {
        if (!collectionOverview) return;
        
        const overviewRect = collectionOverview.getBoundingClientRect();
        const overviewBottom = overviewRect.bottom;
        
        // Si on a dépassé la section overview
        if (overviewBottom - 50 <= 0) {
            stickyNav.classList.add('visible');
        } else {
            stickyNav.classList.remove('visible');
        }
    }
    
    // Écouter le scroll avec throttling pour les performances
    let ticking = false;
    function updateScrollPosition() {
        if (!ticking) {
            requestAnimationFrame(function() {
                checkScrollPosition();
                ticking = false;
            });
            ticking = true;
        }
    }
    
    // Ajouter l'écouteur de scroll
    window.addEventListener('scroll', updateScrollPosition);
    
    // Smooth scroll pour les liens de navigation
    const navLinks = stickyNav.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                // Calculer la position avec offset pour la sticky nav
                const offsetTop = targetElement.offsetTop - 80; // 80px pour laisser de l'espace
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                
                // Ajouter effet de pulsation au bouton cliqué
                this.classList.add('pulse');
                setTimeout(() => {
                    this.classList.remove('pulse');
                }, 2000);
            }
        });
    });
    
    // Mettre en surbrillance le bouton actuel selon la section visible
    function highlightCurrentSection() {
        const sections = ['collection-overview', 'solodex', 'soloset', 'solomasterset'];
        const navButtons = stickyNav.querySelectorAll('.sticky-nav-btn');
        
        sections.forEach((sectionId, index) => {
            const section = document.getElementById(sectionId) || document.querySelector('.' + sectionId);
            if (section) {
                const rect = section.getBoundingClientRect();
                // Si la section est visible (au moins 50% dans le viewport)
                if (rect.top <= window.innerHeight * 0.5 && rect.bottom >= window.innerHeight * 0.5) {
                    navButtons.forEach(btn => btn.classList.remove('active'));
                    if (navButtons[index]) {
                        navButtons[index].classList.add('active');
                    }
                }
            }
        });
    }
    
    // Ajouter la détection de section active au scroll
    window.addEventListener('scroll', function() {
        if (stickyNav.classList.contains('visible')) {
            highlightCurrentSection();
        }
    });
});



