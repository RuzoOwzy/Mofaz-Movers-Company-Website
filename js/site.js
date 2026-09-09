/* =====================================================================
   Mofaz Movers Logistic Co Ltd - site behaviour
   Plain jQuery. No build step, no framework, no server.
   ===================================================================== */

/* =====================================================================
   WHERE THE CONTACT FORM SENDS
   =====================================================================

   Enquiries are delivered by FormSubmit (https://formsubmit.co) - a free,
   unlimited form-to-email relay. There is no account, no dashboard and no
   API key: the address below IS the configuration.

   TO CHANGE THE DESTINATION ADDRESS
   ---------------------------------
   1. Put the new address in CONTACT_EMAIL below and save this file.
   2. Send one test enquiry through the live contact page.
   3. FormSubmit emails that new address a one-time confirmation link.
      Open it and click Confirm. Enquiries start arriving from then on.

   Nothing else changes, and the old address simply stops receiving.

   HIDING THE ADDRESS FROM PUBLIC SOURCE (recommended once testing is done)
   -----------------------------------------------------------------------
   The address below is visible to anyone who reads this file, which over
   time attracts spam. After confirming an address, FormSubmit shows you a
   random alias for it that looks like "a1b2c3d4e5f6...". Put that alias in
   CONTACT_EMAIL instead of the real address - it routes to exactly the same
   inbox, but the address itself never appears on the website.
   ===================================================================== */

var CONTACT_EMAIL = 'Ruzo87@yahoo.com';

/* The visible fallback address, used only in the message shown if sending
   fails. Keep this a real, public company address. */
var FALLBACK_EMAIL = 'info@mofazmovers.co.tz';

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

        /* ---------- Reveal on scroll -------------------------------- */
        var $reveal = $('.reveal');
        if ('IntersectionObserver' in window && $reveal.length) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) { return; }
                    var el = entry.target;
                    var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
                    window.setTimeout(function () { el.classList.add('is-visible'); }, delay);
                    io.unobserve(el);
                });
            }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
            $reveal.each(function () { io.observe(this); });
        } else {
            $reveal.addClass('is-visible').css({ opacity: 1, transform: 'none' });
        }

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

        function showError(name, show) {
            $('[data-error-for="' + name + '"]').toggleClass('hidden', !show);
            $('#' + name).toggleClass('input-validation-error', show);
        }

        function validate() {
            var ok = true;
            var checks = {
                fullName: function (v) { return v.length > 1; },
                email:    function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
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

            /* FormSubmit's AJAX endpoint. The underscore fields are its own
               options: _subject sets the email subject line, _template picks
               the layout, _captcha off because we validate here, and
               _honey is its built-in spam trap (bots fill it, people cannot
               see it). Everything else becomes a row in the email. */
            $.ajax({
                url: 'https://formsubmit.co/ajax/' + CONTACT_EMAIL,
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
                    Phone:     data.phone || '-',
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
                var subject = 'Website enquiry - ' + data.service + ' - ' + data.name;
                var body = [
                    'Name:    ' + data.name,
                    'Company: ' + (data.company || '-'),
                    'Email:   ' + data.email,
                    'Phone:   ' + (data.phone || '-'),
                    'Service: ' + data.service,
                    '',
                    'Cargo details',
                    '-------------',
                    data.message
                ].join('\r\n');
                var mailto = 'mailto:' + FALLBACK_EMAIL +
                    '?subject=' + encodeURIComponent(subject) +
                    '&body=' + encodeURIComponent(body);
                announce('We could not send that automatically.',
                         'Please <a href="' + mailto + '" class="font-semibold underline">send it by email instead</a> ' +
                         '(your details are already filled in), or call ' +
                         '<a href="tel:+255754262495" class="font-semibold underline">+255 754 262495</a>.',
                         false);
            });
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
