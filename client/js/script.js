// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Navigation Toggle ---
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            
            // Animate hamburger icon
            const bars = mobileMenuBtn.querySelectorAll('.bar');
            if (navLinks.classList.contains('active')) {
                bars[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
                bars[1].style.opacity = '0';
                bars[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
            } else {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        });

        // Close mobile menu when a link is clicked
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const bars = mobileMenuBtn.querySelectorAll('.bar');
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            });
        });
    }

    // --- Navbar Scroll Effect ---
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.padding = '5px 0';
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        } else {
            navbar.style.padding = '0';
            navbar.style.boxShadow = 'none';
        }
    });

    // --- Animated Counters ---
    const counters = document.querySelectorAll('.counter');
    let counted = false;

    const startCounters = () => {
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60fps
            
            let current = 0;
            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.innerText = Math.ceil(current).toLocaleString('ar-EG');
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.innerText = target.toLocaleString('ar-EG');
                    if(counter.getAttribute('data-target') === "87") {
                         counter.innerText += "%";
                    }
                }
            };
            updateCounter();
        });
    };

    // --- Intersection Observer for Animations ---
    const observeElements = (elements, className) => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add(className);
                    // Check if we need to start counters
                    if (entry.target.parentNode.classList && entry.target.parentNode.classList.contains('hero-stats') && !counted) {
                         // Fallback check
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        elements.forEach(el => observer.observe(el));
    };

    const fadeUpElements = document.querySelectorAll('.fade-up');
    const slideInElements = document.querySelectorAll('.slide-in');
    
    observeElements(fadeUpElements, 'visible');
    observeElements(slideInElements, 'visible');

    // Specific observer for stats to start counter
    const statsSection = document.querySelector('.hero-stats');
    if (statsSection) {
        const statsObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !counted) {
                startCounters();
                counted = true;
                statsObserver.unobserve(statsSection);
            }
        });
        statsObserver.observe(statsSection);
    }

    // --- Button Click Ripple/Feedback Effect ---
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Remove pulse temporarily on click for visual feedback
            const hasPulse = this.classList.contains('pulse-effect');
            if (hasPulse) {
                this.classList.remove('pulse-effect');
                setTimeout(() => this.classList.add('pulse-effect'), 200);
            }
            
            // Note: actual smooth scrolling is handled by CSS (html { scroll-behavior: smooth; })
            // but we can add logic here if custom smooth scrolling is needed later.
        });
    });

    // Handle dummy links for demonstration purposes
    const dummyLinks = document.querySelectorAll('a[href="#"]');
    dummyLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
        });
    });

});
