/*
 * LLM Namer — invents Anthropic-style names for models that don't exist yet.
 *
 * Anthropic's house style: "Claude <Form> <Version>", where <Form> is a
 * literary or musical form whose weight roughly tracks the model's size —
 * short forms (Haiku) for the small/fast tiers, grand forms (Opus) for the
 * flagship tiers, and a fresh form (Fable) when a new capability lands.
 *
 * Everything here is a toy. No affiliation with Anthropic; the names are made up.
 */

(function () {
    'use strict';

    // Literary / musical forms grouped by "weight" so the name roughly fits
    // the requested tier. Each form carries a short note used in the tagline.
    // The names Anthropic has actually used are marked so we can tell the
    // player when the machine happens to land on a real one.
    var FORMS = {
        nano: [
            { name: 'Haiku', note: 'three lines, seventeen syllables, nothing wasted', real: true },
            { name: 'Tanka', note: 'a haiku that kept going, just a little' },
            { name: 'Couplet', note: 'two lines that rhyme and then stop' },
            { name: 'Epigram', note: 'a whole thought sharpened to a single point' },
            { name: 'Limerick', note: 'small, fast, and faintly ridiculous' },
            { name: 'Cinquain', note: 'five lines, counted on one hand' }
        ],
        fast: [
            { name: 'Sonnet', note: 'fourteen lines with somewhere to be', real: true },
            { name: 'Ballad', note: 'a story you can hum on the first pass' },
            { name: 'Rondeau', note: 'a refrain that comes back before you miss it' },
            { name: 'Aria', note: 'one clear voice, out in front' },
            { name: 'Etude', note: 'a study built for speed and precision' },
            { name: 'Madrigal', note: 'many light voices moving together' }
        ],
        balanced: [
            { name: 'Sonnet', note: 'the reliable middle: structured, quick on its feet', real: true },
            { name: 'Ode', note: 'takes its subject seriously without slowing down' },
            { name: 'Elegy', note: 'measured, thoughtful, unhurried' },
            { name: 'Canto', note: 'one section of a much larger work' },
            { name: 'Nocturne', note: 'calm, capable, works best under pressure' },
            { name: 'Ballade', note: 'three stanzas and a closing bow' }
        ],
        flagship: [
            { name: 'Opus', note: 'the major work; everything the studio can bring', real: true },
            { name: 'Symphony', note: 'many movements, one enormous intention' },
            { name: 'Rhapsody', note: 'sprawling, free, and confident about it' },
            { name: 'Concerto', note: 'a soloist backed by the full ensemble' },
            { name: 'Oratorio', note: 'grand, deliberate, built to hold a room' },
            { name: 'Requiem', note: 'the heaviest lifting, done with composure' }
        ],
        frontier: [
            { name: 'Fable', note: 'a new kind of story with a lesson inside', real: true },
            { name: 'Myth', note: 'the first draft of something the field will retell' },
            { name: 'Saga', note: 'long memory, longer horizon' },
            { name: 'Odyssey', note: 'wanders far and comes back changed' },
            { name: 'Parable', note: 'small on the surface, enormous underneath' },
            { name: 'Prophecy', note: 'points at a capability nobody has shipped yet' }
        ]
    };

    var TIER_LABELS = {
        nano: 'Nano',
        fast: 'Fast',
        balanced: 'Balanced',
        flagship: 'Flagship',
        frontier: 'Frontier'
    };

    var TIER_KEYS = ['nano', 'fast', 'balanced', 'flagship', 'frontier'];

    // Plausible next version numbers. Today's line sits around 4.x–5; the toy
    // looks a step or two ahead.
    var VERSIONS = ['5', '5', '5.5', '6', '6', '6.5', '7'];

    // Extra flavour occasionally appended, the way real releases pick up tags.
    var SUFFIXES = ['', '', '', '', 'Pro', 'Max', 'Mini', 'Air', 'Turbo'];

    var el = {
        card: document.getElementById('card'),
        tierBadge: document.getElementById('tier-badge'),
        versionLabel: document.getElementById('version-label'),
        name: document.getElementById('name'),
        tagline: document.getElementById('tagline'),
        copy: document.getElementById('copy'),
        tier: document.getElementById('tier'),
        lockForm: document.getElementById('lock-form'),
        lockVersion: document.getElementById('lock-version'),
        generate: document.getElementById('generate'),
        shuffle: document.getElementById('shuffle'),
        historyWrap: document.getElementById('history-wrap'),
        history: document.getElementById('history'),
        clearHistory: document.getElementById('clear-history')
    };

    // Current pick, so locks can hold parts across generations.
    var current = { tier: null, form: null, version: null, suffix: '' };
    var history = [];

    function pick(list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    function resolveTier(requested) {
        if (requested && requested !== 'any') {
            return requested;
        }
        return pick(TIER_KEYS);
    }

    function fullName(pickObj) {
        var parts = ['Claude', pickObj.form.name, pickObj.version];
        if (pickObj.suffix) {
            parts.push(pickObj.suffix);
        }
        return parts.join(' ');
    }

    function buildTagline(pickObj) {
        var lead = pickObj.form.note;
        var tierLabel = TIER_LABELS[pickObj.tier].toLowerCase();
        var sentence = lead.charAt(0).toUpperCase() + lead.slice(1) +
            ' — a ' + tierLabel + '-tier model.';
        if (pickObj.form.real) {
            sentence += ' (A form Anthropic really uses.)';
        }
        return sentence;
    }

    function render(pickObj) {
        el.tierBadge.textContent = TIER_LABELS[pickObj.tier];
        el.versionLabel.textContent = 'v' + pickObj.version;
        el.name.textContent = fullName(pickObj);
        el.tagline.textContent = buildTagline(pickObj);

        // Retrigger the entrance animation.
        el.card.classList.remove('card--in');
        // Force reflow so the class re-add restarts the animation.
        void el.card.offsetWidth;
        el.card.classList.add('card--in');
    }

    // ignoreLocks (used by Shuffle) rerolls every part regardless of the checkboxes.
    function generate(ignoreLocks) {
        var keepForm = !ignoreLocks && el.lockForm.checked && current.form;
        var keepVersion = !ignoreLocks && el.lockVersion.checked && current.version;

        var tier = keepForm ? current.tier : resolveTier(el.tier.value);

        var form = keepForm ? current.form : pick(FORMS[tier]);
        var version = keepVersion ? current.version : pick(VERSIONS);
        var suffix = pick(SUFFIXES);

        current = { tier: tier, form: form, version: version, suffix: suffix };
        render(current);
        pushHistory(fullName(current));
    }

    function pushHistory(name) {
        // Skip consecutive duplicates.
        if (history[0] === name) {
            return;
        }
        history.unshift(name);
        history = history.slice(0, 8);
        renderHistory();
    }

    function renderHistory() {
        if (!history.length) {
            el.historyWrap.hidden = true;
            return;
        }
        el.historyWrap.hidden = false;
        el.history.innerHTML = '';
        history.forEach(function (name) {
            var li = document.createElement('li');
            li.className = 'history__item';

            var span = document.createElement('span');
            span.textContent = name;
            li.appendChild(span);

            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'history__copy';
            btn.textContent = 'Copy';
            btn.addEventListener('click', function () {
                copyText(name, btn);
            });
            li.appendChild(btn);

            el.history.appendChild(li);
        });
    }

    function copyText(text, buttonEl) {
        var done = function () {
            var original = buttonEl.textContent;
            buttonEl.textContent = 'Copied';
            buttonEl.classList.add('is-copied');
            setTimeout(function () {
                buttonEl.textContent = original;
                buttonEl.classList.remove('is-copied');
            }, 1200);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fallbackCopy);
        } else {
            fallbackCopy();
        }

        function fallbackCopy() {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                done();
            } catch (e) {
                /* nothing else to do — clipboard just isn't available */
            }
            document.body.removeChild(ta);
        }
    }

    // Wiring.
    el.generate.addEventListener('click', function () { generate(false); });
    el.shuffle.addEventListener('click', function () { generate(true); });
    el.copy.addEventListener('click', function () {
        copyText(el.name.textContent, el.copy);
    });
    el.clearHistory.addEventListener('click', function () {
        history = [];
        renderHistory();
    });

    // Spacebar / Enter re-rolls when focus isn't in a control.
    document.addEventListener('keydown', function (e) {
        var tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'button' || tag === 'textarea') {
            return;
        }
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            generate(false);
        }
    });

    // First pick on load.
    generate(false);
})();
