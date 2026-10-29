# Finance Lab for SELANA

A working finance model for a light electric vehicle maker, built by Paolo Caneparo as part of a freelance application to SELANA's finance team. It is unsolicited, independent, and free for SELANA to keep.

Live page: published with GitHub Pages from this repository (see "Publishing" below).

## What it is

One connected model, in plain HTML, CSS and JavaScript, with no build step and no dependencies:

1. **One Alpha.** Where the €1,900 price goes: VAT, dealer discount, factory price, sea freight, import duty, delivery and payment fees, warranty, and what is left as contribution. Four sliders.
2. **One container.** The cash curve of a container of 280 Alphas, from the supplier deposit to the day the cash is back, with lead times, deposit share, sell-through speed and dealer terms as inputs.
3. **Twelve months.** A November 2026 to October 2027 forecast that sells Alphas and Novas, reorders containers when projected stock falls under one month of demand, pays the factory on its terms, settles VAT quarterly, and delivers the Nova pre-orders that were already paid for.
4. **Three statements.** The same twelve months as an income statement, a balance sheet and an indirect cash flow statement. Two live checks prove that the balance sheet balances every month and that the cash flow statement lands on the cash roll.
5. **Budget versus actual.** A sample month with the variance format, the materiality rule for flags, and the two-paragraph note that goes to the founders.
6. **Bookkeeping.** Ten journal entries for SELANA-specific events: pre-order deposits with VAT on receipt, supplier prepayments, inventory in transit under FOB terms, landed cost and Article 23 import VAT, webshop and dealer sales, delivering a pre-order, Connect subscriptions as deferred revenue, warranty provisions and the quarterly VAT return. Amounts follow the sliders.
7. **Month-end close.** A five-day close with one reconciliation per row.
8. **Why I built it.** The mapping from the job description to the modules, a first-month plan, and who I am.

## Why

The role asks for bookkeeping, financial statements, budget tracking, cost and revenue monitoring, analysis that supports decisions, and clear communication. A CV can only claim those. A model that ties can show them, and it can do so around SELANA's actual situation: assembly in Asia, containers on the water, a long pre-order list, a Nova launch in Q4 2026, a 24-month warranty, VAT and import duty in the Netherlands.

The modules are the ones a finance person at a young hardware company spends their time on. The container curve in particular answers the question a manufacturer asks most: how much cash does one more container need, and for how long.

## What is public and what is assumed

Public, read from selana.nl and press coverage on 29 October 2026:

- Alpha price €1,900 including VAT, lease from €38.32 a month, pay in three parts of €633
- Nova pre-order €899 (list €1,100), release Q4 2026, free cancellation until shipping
- SELANA Connect €120 a year, extra battery €500
- Alpha 28.3 kg, 576 Wh LG battery, 250 W, 25 km/h, up to 45 km; Nova 17.2 kg
- 24-month warranty; assembly in Asia with containers shipped to the Netherlands; funded by angels, no VC; more than ten thousand pre-orders on the list

Everything else (factory price, freight, duty, volumes, payment terms, opex, opening balances) is an assumption and is labelled as such in the page. All assumptions are either a slider or a constant at the top of `app.js`.

## Design

The page uses SELANA's own visual language, read from the public theme on selana.nl: the warm charcoal background, cream headings in a Garamond serif, Mona Sans for text, the royal blue primary button with a 2 px radius, the mint and pine secondary, and the green, ochre and red status colours. Chart colours were adjusted to pass contrast and colour-vision checks on the dark surface. No SELANA logo or imagery is used.

## Files

- `index.html`: the page and all static copy
- `styles.css`: tokens and layout
- `app.js`: the model, the charts and the rendering
- `.nojekyll`: tells GitHub Pages to serve the files as they are

## Publishing

1. Create a repository on GitHub, for example `selana-finance-lab`, and push this folder to its `main` branch.
2. In the repository, open Settings, then Pages, choose "Deploy from a branch", pick `main` and the root folder, and save.
3. The page is served at `https://<user>.github.io/selana-finance-lab/` within a minute or two.

To run it locally, open `index.html` in a browser, or serve the folder with `python3 -m http.server`.

For inspection, the model is exposed in the browser console as `window.FinanceLab` (`S` holds the slider state, `F` the constants, and `forecast()`, `containerCurve()` and `unitEcon()` return the computed results). Changing `S` and calling `rerender()` redraws the page.

## Disclaimer

Finance Lab for SELANA is not affiliated with, endorsed by or produced for SELANA B.V. SELANA and SELANA Alpha are trademarks of their owner. All costs, volumes, terms and balances are illustrative and are not statements about SELANA's actual finances.
