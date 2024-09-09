// External Dependencies
import * as cheerio from 'cheerio';
import fs from 'fs';
import { gotScraping } from 'got-scraping';
import PQueue from 'p-queue';

// Relative Dependencies
import { getSmartProxyUrl } from './proxies.js';

const queue = new PQueue({ concurrency: 150 });

export async function scrapeCrunchbasePage(url, retries = 0) {
  console.log(`url: ${url}, try: ${retries + 1}`);
  const res = await gotScraping({
    url: `http://webcache.googleusercontent.com/search?q=cache:${url}`,
    proxyUrl: getSmartProxyUrl(),
  });

  try {
    const $ = cheerio.load(res.body);
    const companyInfo = {
      logo_url: '',
    };

    const companyName = $('h1.profile-name').text().trim();
    const companyDescription = $('span.description.ng-star-inserted')
      .text()
      .trim();
    const profileHeaderLogo = $('profile-header-logo');

    companyInfo['description'] = companyDescription;

    if (profileHeaderLogo.length) {
      const sources = profileHeaderLogo.find('source');

      if (sources.length) {
        const srcset = sources.first().attr('srcset');

        if (srcset) {
          const srcsetArray = srcset.split(' ');
          companyInfo['logo_url'] = srcsetArray[0];
        }
      }
    }

    $('.icon_and_value li').each((index, element) => {
      const value = $(element).text().trim();

      switch (index) {
        case 0:
          companyInfo['location'] = value;
          break;
        case 1:
          if (value.match(/\d+(-\d+)?/)) {
            companyInfo['employee_count'] = value;
          }
          break;
        case 2:
          if (!['private', 'public'].includes(value.toLowerCase())) {
            companyInfo['last_funding_type'] = value;
          }
          break;
        case 3:
          if (['private', 'public'].includes(value.toLowerCase())) {
            companyInfo['company_rype'] = value;
          }
          break;
        case 4:
          if (value.includes('.com') || value.includes('www.')) {
            companyInfo['website'] = value;
          }
          break;
      }
    });

    if (Object.keys(companyInfo).length === 7) {
      const result = {
        [companyName]: companyInfo,
      };
      fs.appendFileSync('partial-data.txt', JSON.stringify(result, null, 2));

      return result;
    } else {
      fs.appendFileSync('null-companies.txt', `${url}\n`);
      return null;
    }
  } catch (error) {
    if (retries < 1) {
      return scrapeCrunchbasePage(url, retries + 1);
    }
    console.log('error at scrapeCrunchbasePage', error.message);
    throw error;
  }
}

async function processBatch(urls) {
  const batchResults = [];
  await Promise.all(
    urls.map((url) =>
      queue.add(async () => {
        try {
          const result = await scrapeCrunchbasePage(url);
          if (result !== null) {
            batchResults.push(result);
          }
        } catch (error) {
          console.error(`Failed to scrape ${url}: ${error.message}`);
        }
      })
    )
  );
  return batchResults;
}

const getCrunchbaseData = async () => {
  const allUrls = fs.readFileSync(
    './crunchbase-data/crunchbase-filtered-company-list.txt',
    'utf-8'
  );
  const crunchbasePageUrls = allUrls
    .split('\n')
    .filter((url) => url.trim() !== '');

  const batchSize = 100;
  const resultsList = [];

  for (let i = 0; i < crunchbasePageUrls.length; i += batchSize) {
    const batch = crunchbasePageUrls.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1}`);
    const batchResults = await processBatch(batch);
    resultsList.push(...batchResults);
  }

  const finalResult = resultsList.reduce((acc, item) => {
    const [key, value] = Object.entries(item)[0];
    acc[key] = value;
    return acc;
  }, {});

  fs.writeFileSync(
    'crunchbase-data.json',
    JSON.stringify(finalResult, null, 2)
  );
};

(async () => {
  await getCrunchbaseData();
})();
