import { PublicClientApplication } from '@azure/msal-browser';

export const RedirectSuccess = 'msal:handleRedirectEnd';

export const msalInstance =
    process.env.REACT_APP_INFRASTRUCTURE == 'dev'
        ? new PublicClientApplication({
              auth: {
                  clientId: process.env.REACT_APP_CLIENT_ID || '',
                  authority: `https://cedardev.b2clogin.us/cedardev.onmicrosoft.us/B2C_1A_SIGNUP_SIGNIN`,
                  knownAuthorities: [`https://cedardev.b2clogin.us`],
                  redirectUri:
                      window.location.hostname === 'localhost'
                          ? 'http://localhost:3000'
                          : 'https://login.cedar.mylicenseone.com',
              },
              cache: {
                  cacheLocation: 'sessionStorage',
              },
              system: {
                  tokenRenewalOffsetSeconds: 300,
              },
          })
        : new PublicClientApplication({
              auth: {
                  clientId: process.env.REACT_APP_CLIENT_ID || '',
                  redirectUri: 'https://login.evokeplatform.com',
                  authority: `https://evoke.b2clogin.us/evoke.onmicrosoft.us/B2C_1A_SIGNUP_SIGNIN`,
                  knownAuthorities: [`https://evoke.b2clogin.us`],
              },
              cache: {
                  cacheLocation: 'sessionStorage',
              },
              system: {
                  tokenRenewalOffsetSeconds: 300,
              },
          });

export const authRequest = {
    scopes: ['openid', 'profile', 'offline_access'],
    state: window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://' + window.location.hostname,
    extraQueryParameters: {
        host: window.location.host,
    },
};
