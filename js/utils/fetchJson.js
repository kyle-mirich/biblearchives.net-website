
// Fetch JSON data from a URL
async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`HTTP Error: ${response.status}, ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Exception while fetching ${url}: ${error}`);
    return null;
  }
}
