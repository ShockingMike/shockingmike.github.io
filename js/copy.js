/* copy.js — every word on the portfolio and the pricing page, in English and Vietnamese.
   Portfolio: the records copy (en + vi). Pricing: the pricing copy (en + vi);
   the rows that lead from a record to pricing: portfolio_cta.* in the same files.
   Edits agreed by the lead (22/9): English brand.note uses the writer's alternative line; the English Kern and
   Rhumb stories lose the sentence the writer marked; the Vietnamese role line uses the writer's alternative;
   the pricing row on each record is plain, in each language's own words. Keep the keys; change only the strings. */

/* Two languages live here while the site is being built. The build script (build.mjs) keeps exactly one of
   them in each published copy, cutting at the /*[en]* / and /*[vi]* / marks below, so the English site never
   ships a Vietnamese price and the Vietnamese site never ships a dollar figure. */
export const LANGS = ['en', ];

export const COPY = {
  
  en: {
    site: {
      title: 'Shocking Mike · Design Engineer',
      description: 'Sites I designed and coded myself, stacked like records. Pull one out and it tells you how it was made.'
    },
    brand: {
      name: 'Shocking Mike',
      role: ['Design Engineer in Vietnam'],
      note: 'Design and code are both mine, start to finish, without templates or page builders.'
    },
    ui: {
      langToggle: 'Tiếng Việt', langToggleAria: 'Read this page in Vietnamese',
      back: 'Put it back', helpLabel: 'How this works',
      help: 'Every record here is a site I made. Pick one to read how it came together.',
      comingSoon: 'Coming soon', pricing: 'Prices', record: 'Open {title}', home: 'Back to the start',
      loading: 'Getting the record up to speed', loadingPct: '{p}% loaded', loadingDone: '33⅓ rpm. Here we go.',
      // the two unmade records: the write-up is under the wrap, so all anyone gets is this line
      sealed: 'Still sealed. The write-up opens when the site does.',
      details: 'Credits', flip: 'Turn {title} over',
      want: 'Want a page like this?', wantPrice: 'See prices',
      flyer: { eyebrow: 'Shocking Mike', title: 'Prices', more: 'See all prices', open: 'Open the pricing page' },
      email: 'shockingmikedesign@gmail.com', byline: 'Designed & built by Shocking Mike'
    },
    label: { role: 'Role', tech: 'Built with', year: 'Year', status: 'Status' },
    records: {
      kern: {
        subtitle: 'Independent type foundry',
        story: [
          'Fonts sell when you get to play with them. So the name at the top of the page is the demo: letters thicken and stretch as your cursor gets close.',
          'The fonts are real and free. I only gave them new names, and the Trial fonts button gives the game away.'
        ],
        details: { role: 'Name, logo, design, code', tech: 'Variable fonts, GSAP, Lenis', year: '2026', status: 'Out now' },
        cta: { visit: 'Visit the site', preview: 'Watch a clip', pricing: 'Want a page like this?' }
      },
      rhumb: {
        subtitle: 'Coffee roasters',
        story: [
          'Coffee brands love to say they travel for their beans. This one actually sails. You sit at the desk in the ship’s cabin and help fill a six-slot sample chest.',
          'The coffee in the cup is a tiny physics sim, so it sloshes a beat behind the ship.'
        ],
        details: { role: 'Name, logo, 3D scene, sound, code', tech: 'three.js, Web Audio, Canvas', year: '2026', status: 'Out now' },
        cta: { visit: 'Visit the site', preview: 'Watch a clip', pricing: 'Want a 3D page like this?' }
      },
      chom: {
        subtitle: 'Hanoi perfumery',
        story: [
          'Officially, it sells perfume. Really, it sells people in Hanoi back a piece of their childhood; the bottle is just the delivery.',
          'The streets are 3D, painted with scanned brush strokes. The bottle kept vanishing into the painting. A thicker outline barely helped; darkening whatever it stood on did.'
        ],
        details: { role: 'Name, logo, 3D world, code', tech: 'three.js, custom paint shader, MakeHuman, Blender', year: '2026', status: 'Out now' },
        cta: { visit: 'Visit (in Vietnamese)', preview: 'Watch a clip', pricing: 'Want a fully custom page like this?' }
      },
      kozo: {
        subtitle: 'Architecture studio',
        story: [
          'Kōzō is Japanese for structure, the part of a building nobody stops to admire. The studio’s yardstick is an old castle wall: four hundred years without mortar, and no stone that fits anywhere else.',
          'Six architects and two carpenters share a former sawmill in Nagano.'
        ],
        details: { role: 'Name, logo, 3D world, sound, code', tech: 'three.js, custom ink shader, Web Audio', year: '2026', status: 'Out now' },
        cta: { visit: 'Visit the site', preview: 'Watch a clip', pricing: 'Want a whole world like this?' }
      },
      hadal: {
        subtitle: 'Oceanography institute',
        story: ['A dive from the surface into the deep, where it gets dark and the creatures bring their own light.'],
        details: { role: 'Name, logo, design, code', tech: 'Not picked yet', status: 'Hasn’t left the surface' },
        cta: { pricing: 'Want a page like this?' }
      },
      perihelion: {
        subtitle: 'Space travel',
        story: ['The website is the trip: a 3D flight from Earth orbit all the way to the Moon.'],
        details: { role: 'Name, logo, design, code', tech: 'Not picked yet', status: 'Still on the launch pad' },
        cta: { pricing: 'Want a page like this?' }
      },
      blind: {
        subtitle: 'Animation studio',
        story: [
          'A pencil line rubs out; a cut doesn’t. So at Blind Alley nobody cuts in a hurry, and one wrong frame is enough to keep somebody up all night.',
          'Seven animators and a camera operator, at the dead end of a lane in Glasgow.'
        ],
        details: { role: 'Name, logo, 3D film, sound, code', tech: 'three.js, flat-grain shader, Web Audio', year: '2026', status: 'Out now' },
        cta: { visit: 'Visit the site', preview: 'Watch a clip', pricing: 'Want a website like this?' }
      }
    },
    pricing: {
      /* Pricing copy. Lead's calls (22/9): hero without the list of industries; "Works smoothly
         on phones" moved from the three plans into one shared note; plans.example_note kept. */
      meta: { title: 'Prices · Shocking Mike', description: 'Landing pages for brands, designed and coded by Shocking Mike. Three packages with clear prices from $1,500. Replies within 2 working days.' },
      back: 'Back to portfolio',
      hero: { title: 'Prices', lead: 'I design and code landing pages for brands. Every price is on this page, so you don’t have to ask. If you do write, I reply within 2 working days.' },
      label: { plan: 'Package', plans: 'Packages', price: 'Price', timeline: 'Timeline', example: 'Sample page', includes: 'What you get', sample: 'See sample page' },
      // the figures that close each package block: printed big, with these small labels under them
      stats: { weeks: 'weeks', sections: 'parts at most', rounds: 'rounds of changes', fix: 'days of free fixes' },
      notes: ['Your quote is a fixed price for the scope it sets out. Every package works smoothly on phones.'],
      /* plan copy, rewritten 2/10 from Mike's brief (D:\Rando\De_xuat_noi_dung_3_goi_gia.md): the same prices, clearer words.
         tagline: the italic line under the name; fit: who it's right for (card line one, and the home page shelf);
         for: "who it's for"; plus: the line that opens the list on the two upper packages; includes: what you get;
         timeNote: what the weeks count from; honest / upgrade: the two short notes under the figures. */
      plans: {
        standard: { name: 'Standard', tagline: 'One memorable moment', fit: 'Right for running ads or launching one product', priceNote: 'Price depends on how many parts need 3D.',
          for: 'You’re running ads, launching a product, or need a page you can send to customers with pride. You don’t need a long story. You need one clear page that looks like it cost more than it did.',
          plus: '', includes: ['One page with room for up to 6 parts: usually a striking opening, your product, a short story, reviews, and a way to contact or order', 'One memorable moment: a single piece of motion or 3D that people remember', 'A loading screen that shows real progress', 'Background sound where it fits, with a mute button', 'A sketch of the opening to approve before I build anything'],
          timeline: '2–3 weeks', timeNote: 'Counted from the day you approve the sketch.', price: '$1,500–2,500', example: 'Kern Society', cta: 'Choose Standard',
          honest: ['Honestly, is this enough?', 'If your goal is a clean page to send ad traffic to, yes. I won’t suggest paying for more than you need. If your brand needs to explain why it’s worth more, Advanced is built for that.'],
          upgrade: ['Start small, grow later', 'Upgrade to Advanced within 6 months of launch and what you paid for Standard counts toward it.'] },
        advanced: { name: 'Advanced', tagline: 'A place to explore', fit: 'Right for brands that need to show why they’re worth more', priceNote: 'Price depends on the number of 3D scenes and custom animation.',
          for: 'Your brand has a story worth hearing: what makes you different, why you cost more than the shop next door. An ordinary scrolling page runs out of room to tell it. You need visitors to stay, look around, and leave understanding why you’re worth it.',
          plus: 'Everything in Standard, plus:', includes: ['Your story planned with me and written up as a storyline you approve before any design starts', 'A page built as a place to explore, with room for up to 10 parts', 'Your first month of care included: text and photo updates, on me'],
          timeline: '4–6 weeks', timeNote: 'Counted from the day you approve the storyline.', price: 'From $5,000', example: 'Rhumb Line', cta: 'Choose Advanced',
          honest: ['Why I recommend this one', 'Most brands don’t have a design problem. They have a “why us” problem. Standard gives you a good-looking page. Advanced gives visitors a reason to choose you. If you only need a page for ads, Standard is enough and I’ll tell you so.'] },
        custom: { name: 'Custom', tagline: 'A world', fit: 'Right for a launch or flagship moment your brand will be known for', priceNote: 'Price depends on how big the world is; I quote it after we talk.',
          for: 'You have a big picture in mind that no template can hold: a launch, a flagship product, the page your brand will be known for. You don’t want a page that looks like a good version of someone else’s.',
          plus: 'Everything in Advanced, plus:', includes: ['A visual style made only for your brand: every scene and every movement designed for you, nothing reused', 'Two visual directions to choose from before I build. You approve the storyline, then the look, then the full page', 'As many parts as the story needs, across more than one space', 'Your first 3 months of care included'],
          timeline: '6–10 weeks', timeNote: 'Counted from the day you approve the storyline.', price: 'From $10,000', example: 'Chớm', cta: 'Talk to me about Custom',
          honest: ['Honestly, do you need this?', 'If you can’t yet picture what you want, start with Advanced. Custom is for when you already know the page has to be unlike anything else.'] }
      },
      /* the table at the head of the page: three packages side by side, rows gathered in groups. A cell that
         starts with ✓ is drawn as a tick (anything after it is a small note), — as a dash, @sample as the link
         to that package's sample page. */
      compare: {
        caption: 'The three packages side by side', recommend: 'What I recommend', details: 'See details',
        title: 'Compare packages',
        // the four lines on each card, answering the same four questions in the same order: is it for me, what do
        // I get, what if I don't like it, what if it breaks later
        cards: {
          standard: ['Right for running ads or launching one product', 'Room for the essentials: a striking opening, your product, your story, reviews, contact', 'You approve a sketch before I build, plus 2 rounds of changes', 'If anything I built breaks in the first 30 days, I fix it free'],
          advanced: ['Right for brands that need to show why they’re worth more', 'A page visitors explore, not just scroll, with room for up to 10 parts', 'Your story written up as a storyline you approve, plus 3 rounds of changes', 'Free fixes for 60 days, and your first month of care on me'],
          custom: ['Right for a launch or flagship moment your brand will be known for', 'A visual style made only for your brand, with as many parts as the story needs', 'You choose the look from 2 directions before I build, plus 4 rounds of changes', 'Free fixes for 90 days, and your first 3 months of care on me']
        },
        yes: 'included', no: 'not included',
        groups: [
          { name: 'The page', rows: [
            ['Right for', 'Ads, one product launch', 'Brands that need to show why they’re worth more', 'A launch or flagship moment'],
            ['Experience', 'One memorable moment', 'A place to explore', 'A world'],
            ['Parts of the page', 'up to 6', 'up to 10', 'as the story needs'],
            ['Sample page', '@sample', '@sample', '@sample'],
            ['A visual style made for you alone', '—', '—', '✓'],
            ['Background sound, with a mute button', 'where it fits', 'where it fits', 'where it fits'],
            ['Loading screen with real progress', '✓', '✓', '✓']
          ] },
          { name: 'How we work', rows: [
            ['Story planning', 'a sketch of the opening', 'a written storyline you approve', 'storyline, plus 2 visual directions'],
            ['Rounds of changes', '2', '3', '4'],
            ['Free fixes after launch', '30 days', '60 days', '90 days'],
            ['Months of care included', '—', '1', '3'],
            ['Upgrade credit', 'counts toward Advanced within 6 months of launch', '—', '—'],
            ['Time', '2–3 weeks', '4–6 weeks', '6–10 weeks']
          ] },
          { name: 'Every package', all: true, rows: ['Designed from scratch, no templates', 'Works on phone, tablet and desktop', 'A lighter version for older phones', 'Gentle motion across the page', 'A contact or order form that reaches your inbox', 'Basic SEO and a proper image when shared', 'Your own domain, free hosting, visitor stats', 'Every account in your name', 'Full source code handed over'] }
        ],
        after: { care: 'Monthly care from {price}', copy: 'Copywriting quoted separately', text: 'You provide the text' }
      },
      // what every package has, said once under the three of them rather than repeated inside each
      shared: { title: 'Every package includes', items: ['Designed from scratch, no templates', 'Works on phone, tablet and desktop', 'A contact or order form that reaches your inbox', 'Basic SEO and a proper image when the page is shared', 'Live on your own domain, on free hosting (no monthly fee), with visitor stats', 'Every account in your name', 'Full source code handed over'],
        text: 'You provide the text. Copywriting is quoted separately.', notTitle: 'Not included (quoted separately)', not: ['online checkout', 'a blog or self-editing system', 'extra pages', 'extra languages', 'photography', 'logo and brand identity', 'the domain and third-party fees'] },
      care: { name: 'Monthly care', description: 'Text and photo updates, seasonal changes, and keeping the page running well as browsers change. We agree the scope together.', price: '$300–600/month', cta: 'Add monthly care' },
      addon: { name: 'Copywriting', description: 'No words for the page yet? I can write them.', price: 'Quoted separately', cta: 'Add copywriting' },
      process: { title: 'How it works', steps: ['You email me your brand, current website, deadline and budget.', 'Within 2 working days, I send a fixed quote with exactly what’s included.', 'You pay 50% upfront. We agree the plan first (a sketch of the opening on Standard; a written storyline on Advanced and Custom, plus two visual directions to choose from on Custom), then I build. The number of rounds of changes depends on the package.', 'The page goes live on your domain and account; you pay the other 50%.'] },
      terms: { title: 'Terms', items: ['You provide the text and images. Copywriting is quoted separately.', 'The finished page and all its source code belong to you.', 'Changes beyond your package’s rounds of changes are quoted before any work begins.', 'Payment by bank transfer in Vietnam, or PayPal from abroad.', 'We work over email at shockingmikedesign@gmail.com, with calls when needed.'] },
      faq: { title: 'Common questions', items: [
        ['What do I need to prepare?', 'Your brand name, the product to feature, any text and photos you have, and a few websites you like. I’ll tell you if anything’s missing.'],
        ['Can the page be changed after handover?', 'Yes. If anything I built breaks, I fix it free for 30, 60 or 90 days after launch, depending on the package. Advanced includes your first month of care and Custom your first 3 months; after that, monthly care covers updates and seasonal pages.'],
        ['Will it work well and load fast on phones?', 'Yes. I test every page on phones and large monitors before handover. 3D pages take a few seconds to load on a phone, so they open with a loading screen that shows real progress.']
      ] },
      contact: { title: 'Not sure which package fits?', text: 'Tell me your budget and what the page needs to do. I’ll suggest the package that fits, even when a smaller one will do.', email: 'shockingmikedesign@gmail.com',
        mailSubject: 'Question about a landing page for [your brand]',
        mailBody: ['Hi Mike,', '', 'Brand:', 'Current website (or Instagram, online store…):', 'Needed by:', 'Budget:', 'What I need the page to do:', '', '[Your name]'] },
      form: {
        title: 'Your project', intro: 'Fill in a few details to create an estimate, then send it to me.',
        plan: 'Package', care: 'Monthly care', careMonths: 'Months', careNone: 'Not needed', careUnit: 'months',
        copywriting: 'I need copywriting', copywritingNote: 'quoted separately',
        fields: [
          { key: 'brand', label: 'Brand name', hint: 'And what you sell', required: true },
          { key: 'site', label: 'Current website', hint: 'Website, Instagram, online store… (if any)' },
          { key: 'deadline', label: 'Needed by', hint: 'Leave blank if there’s no fixed date' },
          { key: 'budget', label: 'Budget', hint: 'For example: $2,000–3,000' }
        ],
        required: 'required', errorPlan: 'Choose a package to continue.', errorBrand: 'Enter your brand name to continue.', submit: 'Create estimate'
      },
      estimate: {
        title: 'ESTIMATE', from: 'Shocking Mike · Landing page design and development',
        date: 'Date', client: 'Brand', site: 'Current website', deadline: 'Needed by', budget: 'Budget', empty: 'Not provided',
        item: { standard: 'Standard package: one memorable moment, room for up to 6 parts', advanced: 'Advanced package: a place to explore, up to 10 parts, first month of care included', custom: 'Custom package: a world made for your brand, first 3 months of care included', care: 'Monthly care × {n} months', copywriting: 'Copywriting', copywritingAmount: 'Quoted separately' },
        total: 'Estimated total', totalFrom: 'From', excludes: 'Excludes copywriting (quoted separately).',
        note: 'This is a preliminary estimate based on published prices. Mike will confirm the final price and scope within 2 working days.',
        termsTitle: 'Terms in brief',
        terms: ['50% deposit to start; the other 50% when the page goes live.', 'The plan is approved before the build starts; {rounds} rounds of changes.', 'The client provides text and images.', 'The page and source code belong to the client, hosted on the client’s own domain and accounts.', 'Payment by bank transfer (Vietnam) or PayPal (international).', 'Free fixes for {days} days after launch if anything Mike built breaks.'],
        contactLabel: 'Contact', contact: 'shockingmikedesign@gmail.com'
      },
      button: { send: 'Send request to Mike', copy: 'Copy estimate', copied: 'Copied', edit: 'Edit details', print: 'Print or save as PDF', close: 'Close' },
      send: { hint: 'Opens your email app with the estimate already in the message.', fallback: 'Email app didn’t open? Copy the estimate and send it to shockingmikedesign@gmail.com.' },
      mail: { subject: 'Estimate request: {plan} for {brand}', body: ['Hi Mike,', '', 'I’d like a landing page for {brand}. Here’s my estimate:', '', '{estimate}', '', 'Anything else:', '', '[Your name]', '[Phone number, if you’d like a call]'] }
    }
  },
  

  
};
