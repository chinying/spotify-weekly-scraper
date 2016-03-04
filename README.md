# Spotify Weekly Scrapper  
My attempt at scrapping the Discover Weekly Playlist.
Work in progress. 

Going to see if this can be automated (ie. just throw it to a cron job), but it appears a login is required so I wasn't able to do this without a browser. 


---
**credentials.js** is as follows
```
var cred = {
  user : "<spotifyid>",
  id : "<client_id>",
  secret : "<client_secret>"
};

module.exports = cred;
```

