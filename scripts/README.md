# Glossary Scraper

This script scrapes the Kingdom Death Monster Living Glossary and generates a JSON file for use in the app.

## Usage

### Manual Scraping

```bash
npm run glossary:scrape
```

### Automatic Build-time Scraping

The script runs automatically before each build:

```bash
npm run build  # Runs glossary:scrape first
```

## Output

The script generates `src/data/glossary.json` with the following structure:

```json
{
  "terms": [
    {
      "term": "Action",
      "definition": "Description of the term...",
      "category": "Combat",
      "relatedTerms": ["Reaction", "Timing"],
      "url": "https://kingdomdeath.com/rules/living-glossary#action"
    }
  ],
  "lastUpdated": "2026-02-05T12:00:00.000Z",
  "version": "1.0.0"
}
```

## Adjusting the Scraper

The glossary webpage structure may change. If the scraper stops working:

1. Visit https://kingdomdeath.com/rules/living-glossary in your browser
2. Inspect the HTML structure (right-click → Inspect)
3. Look for patterns in how terms and definitions are organized
4. Update the `parseGlossaryHTML` function in `scrape-glossary.mjs`

### Common HTML Patterns to Look For

```html
<!-- Pattern 1: Definition List -->
<dl>
  <dt>Term Name</dt>
  <dd>Term definition...</dd>
</dl>

<!-- Pattern 2: Headings with Paragraphs -->
<h3>Term Name</h3>
<p>Term definition...</p>

<!-- Pattern 3: Divs with Classes -->
<div class="glossary-term">
  <h4 class="term-name">Term Name</h4>
  <p class="term-definition">Term definition...</p>
</div>
```

### Example: Updating the Parser

If the page uses `<h4>` tags for terms and `<div class="definition">` for definitions:

```javascript
const h4Pattern = /<h4[^>]*>(.*?)<\/h4>\s*<div[^>]*class="definition"[^>]*>(.*?)<\/div>/gs
let match

while ((match = h4Pattern.exec(html)) !== null) {
  const term = cleanText(match[1])
  const definition = cleanText(match[2])
  if (term && definition) {
    terms.push({ term, definition })
  }
}
```

## Troubleshooting

### No terms found

- Check if the website structure has changed
- Try fetching the URL manually to verify it's accessible
- Update the regex patterns in `parseGlossaryHTML`

### HTTP errors

- Verify the URL is correct
- Check if the website is online
- Ensure you have internet connectivity

### Build fails

- The `prebuild` script runs before every build
- If scraping fails, the build will fail
- You can temporarily disable prebuild in `package.json` if needed
