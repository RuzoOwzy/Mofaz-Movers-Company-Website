/* =====================================================================
   Mofaz Movers Logistic Co Ltd - site behaviour
   Plain jQuery. No build step, no framework, no server.
   ===================================================================== */

/* =====================================================================
   WHERE THE CONTACT FORM SENDS
   =====================================================================

   The destination is NOT set here. It is read at page load from
   config.json in the site root, so changing where enquiries go is a
   one-line edit to that file - no touching this script.

   config.json holds two values:

     contactEmail      the address enquiries are delivered to
     formsubmitAlias   optional. FormSubmit gives every confirmed address a
                       random alias. If this is filled in, it is used
                       INSTEAD of the address, so the real address never
                       appears anywhere on the website.

   Whichever of the two is used becomes the FormSubmit endpoint:
   https://formsubmit.co/ajax/<value>

   A NOTE ON WHAT THIS DOES AND DOES NOT HIDE
   ------------------------------------------
   config.json is served publicly like every other file here - anyone can
   open it in a browser. It makes the address easy to CHANGE; it does not
   make it secret. The alias is what actually keeps the address away from
   scrapers, because the alias is all the site ever carries.
   ===================================================================== */

var CONFIG_URL = 'config.json';

/* The FormSubmit endpoint, read from the form's own action attribute in
   contact.html (which carries "https://formsubmit.co/" and nothing more).
   Keeping it in the markup means the relay the form posts to is visible
   where the form is, while the address stays out of the page entirely. */
var formsubmitBase = 'https://formsubmit.co/';

/* The destination address. Deliberately EMPTY until config.json has been
   read - no address is written into this file or into contact.html, so
   config.json is the single place the destination is defined. */
var formTarget = '';

/* Resolves once the config request has finished, whether it succeeded or
   not. The submit handler waits on it, so an enquiry sent in the first
   moment after load still goes to the configured destination. */
var configReady = null;

/* ---------------------------------------------------------------------
   Read config.json and point the form at whatever it names.
   Runs only on the page that actually has the form.
   --------------------------------------------------------------------- */
function applyContactTarget(target, source) {
    formTarget = target;
    var form = document.getElementById('enquiryForm');
    if (form && target) {
        form.setAttribute('action', formsubmitBase + target);
        form.setAttribute('data-target-source', source);
    }
}

function loadContactConfig() {
    var form = document.getElementById('enquiryForm');
    if (!form) { return; }

    /* Read the bare endpoint once, before anything appends to it. */
    var declared = (form.getAttribute('action') || '').trim();
    if (declared) {
        formsubmitBase = declared.charAt(declared.length - 1) === '/' ? declared : declared + '/';
    }

    if (!window.fetch) {
        configReady = { then: function (fn) { fn(); return this; } };
        return;
    }

    configReady = fetch(CONFIG_URL, { cache: 'no-cache' })
        .then(function (response) {
            if (!response.ok) { throw new Error(CONFIG_URL + ' returned ' + response.status); }
            return response.json();
        })
        .then(function (config) {
            var alias = String(config.formsubmitAlias || '').trim();
            var email = String(config.contactEmail || '').trim();

            if (alias) {
                applyContactTarget(alias, 'alias from config.json');
            } else if (email) {
                applyContactTarget(email, 'address from config.json');
            }
        })
        .catch(function (err) {
            /* formTarget stays empty; the form says so rather than
               pretending to send. */
            if (window.console && window.console.error) {
                window.console.error('Could not read ' + CONFIG_URL +
                    ' - the contact form has no destination.', err);
            }
        });
}

/* The public address shown on the page itself, used only in the message
   offered when sending fails. Read from the page so it can never drift
   out of step with what visitors can see. */
function pageFallbackEmail() {
    var link = document.querySelector('#main a[href^="mailto:"]');
    return link ? link.getAttribute('href').replace('mailto:', '').split('?')[0] : '';
}

/* ---------------------------------------------------------------------
   Safety net.

   The scroll-in animation hides content until this script reveals it, but
   only while <html> carries the "js" class. showEverything() drops that
   class, which makes every section visible immediately. It runs if jQuery
   is missing or if anything below throws, so a script problem can never
   leave the pages scrolling past empty sections.
   --------------------------------------------------------------------- */
function showEverything() {
    document.documentElement.className =
        document.documentElement.className.replace(/\bjs\b/, '');
}

(function ($) {
    'use strict';

    if (typeof $ === 'undefined') {   // jQuery did not load
        showEverything();
        return;
    }

    $(function () {
      try {

        /* ---------- Sticky header ---------------------------------- */
        var $header = $('#siteHeader');
        var $rule = $('#headerRule');
        var isTransparent = $header.data('transparent') === true || $header.data('transparent') === 'true';

        function paintHeader() {
            var scrolled = $(window).scrollTop() > 40;
            if (isTransparent) {
                $header.toggleClass('bg-navy-900/95 backdrop-blur shadow-lg', scrolled)
                       .toggleClass('bg-transparent', !scrolled);
            }
            $rule.toggleClass('opacity-100', scrolled).toggleClass('opacity-0', !scrolled);
        }
        paintHeader();
        $(window).on('scroll', paintHeader);

        /* ---------- Mobile navigation ------------------------------ */
        var $nav = $('#mobileNav');
        var $panel = $('#mobileNavPanel');
        var $toggle = $('#navToggle');

        function openNav() {
            $nav.removeClass('hidden');
            $toggle.attr('aria-expanded', 'true');
            $('body').addClass('overflow-hidden');
            window.requestAnimationFrame(function () { $panel.removeClass('translate-x-full'); });
        }

        function closeNav() {
            $panel.addClass('translate-x-full');
            $toggle.attr('aria-expanded', 'false');
            $('body').removeClass('overflow-hidden');
            window.setTimeout(function () { $nav.addClass('hidden'); }, 300);
        }

        $toggle.on('click', openNav);
        $nav.on('click', '[data-close-nav]', closeNav);
        $nav.on('click', 'a', closeNav);
        $(document).on('keydown', function (e) {
            if (e.key === 'Escape' && !$nav.hasClass('hidden')) { closeNav(); }
        });

        /* ---------- Reveal on scroll --------------------------------
           A plain scroll check rather than IntersectionObserver. The
           observer needed a visible-fraction threshold, and a block taller
           than the viewport - or one whose position shifted while images
           were still loading - could fall under it and never be revealed,
           leaving a section blank. Comparing positions on every scroll has
           no such edge case: anything at or above the trigger line is
           shown, and it is re-checked as the page settles. */
        var $reveal = $('.reveal');

        function showReveals() {
            if (!$reveal.length) { return; }
            var line = window.innerHeight * 0.92;
            var remaining = [];
            $reveal.each(function () {
                var el = this;
                if (el.classList.contains('is-visible')) { return; }
                if (el.getBoundingClientRect().top <= line) {
                    var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
                    window.setTimeout(function () { el.classList.add('is-visible'); }, delay);
                } else {
                    remaining.push(el);
                }
            });
            $reveal = $(remaining);
        }

        var revealPending = false;
        function queueReveals() {
            if (revealPending) { return; }
            revealPending = true;
            window.requestAnimationFrame(function () {
                revealPending = false;
                showReveals();
            });
        }

        showReveals();
        $(window).on('scroll resize', queueReveals);

        /* Images finishing later can move things up into view. */
        $(window).on('load', showReveals);
        window.setTimeout(showReveals, 400);
        window.setTimeout(showReveals, 1500);

        /* ---------- Count-up figures -------------------------------- */
        function countUp($el) {
            var target = parseFloat($el.data('count')) || 0;
            var suffix = $el.data('suffix') || '';
            var duration = 1200;
            var t0 = null;
            function tick(ts) {
                if (!t0) { t0 = ts; }
                var p = Math.min((ts - t0) / duration, 1);
                var eased = 1 - Math.pow(1 - p, 3);
                $el.text(Math.round(target * eased) + suffix);
                if (p < 1) { window.requestAnimationFrame(tick); }
            }
            window.requestAnimationFrame(tick);
        }

        var $counters = $('[data-count]');
        if ($counters.length && 'IntersectionObserver' in window) {
            var co = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) { return; }
                    countUp($(entry.target));
                    co.unobserve(entry.target);
                });
            }, { threshold: 0.4 });
            $counters.each(function () { co.observe(this); });
        }

        /* ---------- Contact form ------------------------------------ */
        var $form = $('#enquiryForm');

        /* Read config.json and point the form wherever it says. */
        loadContactConfig();

        function showError(name, show) {
            $('[data-error-for="' + name + '"]').toggleClass('hidden', !show);
            $('#' + name).toggleClass('input-validation-error', show);
        }

        function validate() {
            var ok = true;
            var checks = {
                fullName: function (v) { return v.length > 1; },
                email:    function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
                phone:    function (v) { return (v.replace(/\D/g, '')).length >= 7; },
                service:  function (v) { return v !== ''; },
                message:  function (v) { return v.length >= 10; }
            };
            $.each(checks, function (name, test) {
                var valid = test($.trim($('#' + name).val() || ''));
                showError(name, !valid);
                if (!valid && ok) { $('#' + name).trigger('focus'); }
                ok = ok && valid;
            });
            return ok;
        }

        $form.on('input change', 'input, select, textarea', function () {
            var name = this.id;
            if ($('[data-error-for="' + name + '"]').is(':visible')) { validate(); }
        });

        $form.on('submit', function (e) {
            e.preventDefault();
            if (!validate()) { return; }

            /* Honeypot: only a bot fills this in. Say nothing, send nothing. */
            if ($.trim($('#website').val() || '') !== '') { return; }

            var data = {
                name:    $.trim($('#fullName').val()),
                company: $.trim($('#company').val()),
                email:   $.trim($('#email').val()),
                phone:   $.trim($('#phone').val()),
                service: $('#service').val(),
                message: $.trim($('#message').val())
            };

            var $btn = $form.find('[type=submit]');
            $btn.prop('disabled', true).addClass('opacity-70').find('[data-btn-label]').text('Sending...');

            /* These three are siblings on purpose: send() and
               offerFallback() both call finish() and announce(), so they
               must live in the same scope. */
            function finish() {
                $btn.prop('disabled', false).removeClass('opacity-70').find('[data-btn-label]').text('Send enquiry');
            }

            function announce(headline, detail, ok) {
                var $box = $('#formSuccess');
                $box.removeClass('hidden border-emerald-200 bg-emerald-50 border-amber-200 bg-amber-50')
                    .addClass(ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50');
                $box.find('span').first()
                    .removeClass('bg-emerald-600 bg-amber-600')
                    .addClass(ok ? 'bg-emerald-600' : 'bg-amber-600');
                $box.find('h3').removeClass('text-emerald-900 text-amber-900')
                    .addClass(ok ? 'text-emerald-900' : 'text-amber-900').text(headline);
                $box.find('p').removeClass('text-emerald-800 text-amber-800')
                    .addClass(ok ? 'text-emerald-800' : 'text-amber-800').html(detail);
                $('html, body').animate({ scrollTop: $box.offset().top - 120 }, 400);
            }

            /* config.json may still be in flight on a very fast submit. */
            if (configReady && configReady.then) {
                configReady.then(send, send);
            } else {
                send();
            }

            function send() {

            /* No destination means config.json could not be read. Say so
               honestly and offer the email and phone instead - never
               swallow an enquiry. */
            if (!formTarget) {
                finish();
                offerFallback('We could not send that automatically.');
                return;
            }

            /* FormSubmit's AJAX endpoint. The underscore fields are its own
               options: _subject sets the email subject line, _template picks
               the layout, _captcha off because we validate here, and
               _honey is its built-in spam trap (bots fill it, people cannot
               see it). Everything else becomes a row in the email. */
            $.ajax({
                url: formsubmitBase + 'ajax/' + formTarget,
                method: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({
                    _subject:  'Website enquiry - ' + data.service + ' - ' + data.name,
                    _template: 'table',
                    _captcha:  'false',
                    _honey:    $.trim($('#website').val() || ''),
                    Name:      data.name,
                    Company:   data.company || '-',
                    Email:     data.email,
                    Phone:     data.phone,
                    Service:   data.service,
                    Message:   data.message
                })
            }).done(function () {
                $form[0].reset();
                finish();
                announce('Thank you - we have your enquiry.',
                         'Your message has reached the Mofaz Movers inbox and a member of the team ' +
                         'will be in touch on the next working day. If it is urgent, call ' +
                         '<a href="tel:' + '+255754262495' + '" class="font-semibold underline">+255 754 262495</a>.',
                         true);
            }).fail(function () {
                finish();
                offerFallback('We could not send that automatically.');
            });
            }   /* end send() */

            function offerFallback(headline) {
                var subject = 'Website enquiry - ' + data.service + ' - ' + data.name;
                var body = [
                    'Name:    ' + data.name,
                    'Company: ' + (data.company || '-'),
                    'Email:   ' + data.email,
                    'Phone:   ' + data.phone,
                    'Service: ' + data.service,
                    '',
                    'Cargo details',
                    '-------------',
                    data.message
                ].join('\r\n');

                var address = pageFallbackEmail();
                var parts = [];
                if (address) {
                    parts.push('Please <a href="mailto:' + address +
                        '?subject=' + encodeURIComponent(subject) +
                        '&body=' + encodeURIComponent(body) +
                        '" class="font-semibold underline">send it by email instead</a> ' +
                        'with your details already filled in');
                }
                var tel = $('a[href^="tel:"]').first().attr('href');
                if (tel) {
                    parts.push((parts.length ? ', or call ' : 'Please call ') +
                        '<a href="' + tel + '" class="font-semibold underline">' +
                        $('a[href^="tel:"]').first().text().trim() + '</a>');
                }
                announce(headline, parts.join('') + '.', false);
            }
        });

        /* ---------- Which menu item is "current" --------------------
           Most menu items point at a whole page. "Partners" points at a
           section inside about.html, so on that page the highlight has to
           follow the scroll position: About while you are above the partner
           section, Partners once you reach it. Without this, About stayed
           lit the entire time and Partners never lit at all. */
        (function () {
            var here = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
            var $links = $('header .nav-link');
            var sectionLinks = [];   // menu items pointing at a section of THIS page
            var $pageLink = null;    // the menu item for this page as a whole

            $links.each(function () {
                var href = ($(this).attr('href') || '').toLowerCase();
                var parts = href.split('#');
                var file = parts[0] || here;
                if (file !== here) { return; }
                if (parts[1]) {
                    var $target = $('#' + parts[1]);
                    if ($target.length) { sectionLinks.push({ $link: $(this), $target: $target }); }
                } else {
                    $pageLink = $(this);
                }
            });

            if (!sectionLinks.length) { return; }

            function light($link, on) {
                $link.toggleClass('is-active', on)
                     .toggleClass('text-white', on)
                     .toggleClass('text-white/80', !on);
            }

            function updateNav() {
                var line = $(window).scrollTop() + 140;   // just below the fixed header
                var active = null;
                $.each(sectionLinks, function (i, item) {
                    var top = item.$target.offset().top;
                    if (line >= top && line < top + item.$target.outerHeight()) { active = item; }
                });
                $.each(sectionLinks, function (i, item) { light(item.$link, item === active); });
                if ($pageLink) { light($pageLink, active === null); }
            }

            updateNav();
            $(window).on('scroll resize', updateNav);
        })();

        /* ---------- Smooth anchor scrolling with header offset ------ */
        $(document).on('click', 'a[href^="#"]:not([href="#"])', function (e) {
            var id = $(this).attr('href');
            var $target = $(id);
            if (!$target.length) { return; }
            e.preventDefault();
            $('html, body').animate({ scrollTop: $target.offset().top - 96 }, 450);
            history.replaceState(null, '', id);
        });

        /* ---------- Footer year -------------------------------------- */
        $('[data-year]').text(new Date().getFullYear());

      } catch (err) {
        showEverything();
        if (window.console && window.console.error) {
            window.console.error('site.js could not run:', err);
        }
      }
    });

})(window.jQuery);
