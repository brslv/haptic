axios.interceptors.response.use(
  function(response) {
    return response;
  },
  function(error) {
    if (error.response.status === 401) window.location.href = "/login";
    if (error.response.status === 500) alert(error.response.data.err);
    return Promise.reject(error);
  }
);
