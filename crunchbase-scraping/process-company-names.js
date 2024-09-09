import fs from 'fs';

// List of words to filter out (you can add more words here)
const data = fs.readFileSync('null-companies.txt', 'utf8');
const filterWords = data.split('\n').filter((url) => url.trim() !== '');

function filterUrls(inputFile, outputFile, wordsToFilter) {
  fs.readFile(inputFile, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading the file: ${err}`);
      return;
    }

    const lines = data.split('\n');
    const filteredLines = lines.filter((line) => {
      // Check if the line contains any of the filter words
      return !wordsToFilter.some((word) => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(line);
      });
    });

    fs.writeFile(outputFile, filteredLines.join('\n'), 'utf8', (err) => {
      if (err) {
        console.error(`Error writing the file: ${err}`);
        return;
      }
      console.log(`Filtered URLs have been saved to ${outputFile}`);
    });
  });
}

filterUrls(
  'crunchbase-data/crunchbase-filtered-company-list.txt',
  'crunchbase-data/crunchbase-filtered-company-list2.txt',
  filterWords
);
