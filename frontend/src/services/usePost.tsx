const post = (csrf: string, url: string, data?: string | FormData) => {
   return window.fetch(url, {
      method: "POST",
      headers: new Headers({ "X-CSRFToken": csrf }),
      credentials: "same-origin", //  Send cookies from same origin
      body: data
   });
};

export default post;
