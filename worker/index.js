// Sends every old or www address to https://bazzbooks.store (same page), then serves the site.
const HOME = 'bazzbooks.store';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== HOME && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      url.protocol = 'https:'; url.hostname = HOME; url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
