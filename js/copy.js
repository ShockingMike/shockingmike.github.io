/* copy.js — every word on the portfolio and the pricing page, in English and Vietnamese.
   Portfolio: docs/content/portfolio-records.md (+ -vi). Pricing: docs/content/pricing-serious.md (+ -vi);
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
      // the three unmade records: the write-up is under the wrap, so all anyone gets is this line
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
        story: ['Architects think in plans, then in volumes. So the floor plan draws itself first, then rises into 3D blocks.'],
        details: { role: 'Name, logo, design, code', tech: 'Not picked yet', status: 'Still on the drawing board' },
        cta: { pricing: 'Want a page like this?' }
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
      }
    },
    pricing: {
      /* docs/content/pricing-serious.md. Lead's calls (22/9): hero without the list of industries; "Works smoothly
         on phones" moved from the three plans into one shared note; plans.example_note kept. */
      meta: { title: 'Prices · Shocking Mike', description: 'Landing pages for brands, designed and coded by Shocking Mike. Three packages with clear prices from $1,500. Replies within 2 working days.' },
      back: 'Back to portfolio',
      hero: { title: 'Prices', lead: 'I design and code landing pages for brands. Every price is on this page, so you don’t have to ask. If you do write, I reply within 2 working days.' },
      label: { plan: 'Package', plans: 'Packages', price: 'Price', timeline: 'Timeline', example: 'Sample page', includes: 'Includes' },
      notes: ['Your quote is a fixed price for the scope it sets out. Every package works smoothly on phones.'],
      plans: {
        standard: { name: 'Standard', for: 'You need a sharp page live soon, with one moment people stop to play with.', includes: ['One landing page built to sell', 'One custom interactive highlight', 'A 3D opening scene or scroll effect'], timeline: '2–3 weeks', price: '$1,500–2,500', example: 'Kern Society', cta: 'Choose Standard' },
        advanced: { name: 'Advanced', for: 'You want people to stay on the page and look around.', includes: ['A 3D page visitors can explore', 'Your brand story guides the way', 'Sound and lighting where they fit'], timeline: '4–6 weeks', price: 'From $5,000', example: 'Rhumb Line', cta: 'Choose Advanced' },
        custom: { name: 'Custom', for: 'You want a world built around your brand, with nothing taken off the shelf.', includes: ['A brand world built from scratch', 'Story, visuals and motion', '3D, sound and lighting as needed'], timeline: '6–10 weeks', price: 'From $10,000', example: 'Chớm', note: 'I take one of these at a time.', cta: 'Choose Custom' }
      },
      care: { name: 'Monthly care', description: 'After launch, I keep the page up to date and running. Add it to any package.', includes: ['Text updates and photo swaps', 'Seasonal promotion pages', 'Monitoring to keep the page running'], price: '$300–600/month', priceNote: 'The exact rate depends on how much work each month needs.', cta: 'Add monthly care' },
      addon: { name: 'Copywriting', description: 'No words for the page yet? I can write them.', price: 'Quoted separately', cta: 'Add copywriting' },
      process: { title: 'How it works', steps: ['You email me your brand, current website, deadline and budget.', 'Within 2 working days, I send a fixed quote with exactly what’s included.', 'You pay 50% upfront. I sketch the opening section for approval, then build. Up to 2 rounds of changes.', 'The page goes live on your domain and account; you pay the other 50%.'] },
      terms: { title: 'Terms', items: ['You provide the text and images. Copywriting is quoted separately.', 'The finished page and all its source code belong to you.', 'Changes beyond 2 rounds are quoted before any work begins.', 'Payment by bank transfer in Vietnam, or PayPal from abroad.', 'We work over email at shockingmikedesign@gmail.com, with calls when needed.'] },
      faq: { title: 'Common questions', items: [
        ['What do I need to prepare?', 'Your brand name, the product to feature, any text and photos you have, and a few websites you like. I’ll tell you if anything’s missing.'],
        ['Can the page be changed after handover?', 'Yes. Free bug fixes for 30 days after launch. After that, monthly care covers updates and seasonal pages.'],
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
        item: { standard: 'Standard package: sales landing page with one interactive highlight', advanced: 'Advanced package: explorable 3D page led by your brand story', custom: 'Custom package: brand world built from scratch', care: 'Monthly care × {n} months', copywriting: 'Copywriting', copywritingAmount: 'Quoted separately' },
        total: 'Estimated total', totalFrom: 'From', excludes: 'Excludes copywriting (quoted separately).',
        note: 'This is a preliminary estimate based on published prices. Mike will confirm the final price and scope within 2 working days.',
        termsTitle: 'Terms in brief',
        terms: ['50% deposit to start; the other 50% when the page goes live.', 'Opening section sketched for approval before build; up to 2 rounds of changes.', 'The client provides text and images.', 'The page and source code belong to the client, hosted on the client’s own domain and accounts.', 'Payment by bank transfer (Vietnam) or PayPal (international).', 'Free bug fixes for 30 days after launch.'],
        contactLabel: 'Contact', contact: 'shockingmikedesign@gmail.com'
      },
      button: { send: 'Send request to Mike', copy: 'Copy estimate', copied: 'Copied', edit: 'Edit details', print: 'Print or save as PDF', close: 'Close' },
      send: { hint: 'Opens your email app with the estimate already in the message.', fallback: 'Email app didn’t open? Copy the estimate and send it to shockingmikedesign@gmail.com.' },
      mail: { subject: 'Estimate request: {plan} for {brand}', body: ['Hi Mike,', '', 'I’d like a landing page for {brand}. Here’s my estimate:', '', '{estimate}', '', 'Anything else:', '', '[Your name]', '[Phone number, if you’d like a call]'] }
    }
  },
  

  
};
