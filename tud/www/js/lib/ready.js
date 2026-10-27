// Calls a function once the page's HTML has been parsed, like jQuery's
// $(document).ready. require.js loads modules asynchronously, so the
// document may already be ready by the time this is called.
define(function () {
  return function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    }
    else {
      callback();
    }
  };
});
