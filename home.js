(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (RM) document.documentElement.classList.add('rm');

/* ================= NAV + MENU ================= */
const nav = $('#nav'), menuBtn = $('#menuBtn'), menu = $('#mobileMenu');
function setMenu(open) {
  menu.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.classList.toggle('menu-open', open);
}
menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

/* ================= WALLET CONNECT (EVM) ================= */
(() => {
  const buttons = $$('[data-connect-wallet]');
  if (!buttons.length) return;
  const found = new Map();                 // EIP-6963 wallets (MetaMask, Rabby, Coinbase, Phantom EVM...)
  let connectedAddress = '', active = null, toastTimer;
  const short = a => `${a.slice(0, 6)}…${a.slice(-4)}`;

  addEventListener('eip6963:announceProvider', e => {
    const d = e.detail;
    if (d && d.info && d.provider) found.set(d.info.uuid, d);
  });
  const discover = () => { try { dispatchEvent(new Event('eip6963:requestProvider')); } catch (_) {} };
  discover();

  function toast(msg, link) {
    let el = $('.wallet-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'wallet-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    if (link) {
      const a = document.createElement('a');
      a.href = link.href; a.textContent = ' ' + link.text; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.style.cssText = 'text-decoration:underline;color:#e9c4ff';
      el.appendChild(a);
    }
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 6500);
  }

  function paint(address) {
    connectedAddress = address || '';
    buttons.forEach(b => {
      b.textContent = connectedAddress ? short(connectedAddress) : 'Connect wallet';
      b.classList.toggle('is-connected', !!connectedAddress);
      b.setAttribute('aria-label', connectedAddress ? `Wallet connected: ${connectedAddress}` : 'Connect wallet');
    });
  }

  function legacyProvider() {
    const eth = window.ethereum;
    if (!eth) return null;
    if (Array.isArray(eth.providers) && eth.providers.length) return eth.providers.find(p => p.isMetaMask) || eth.providers[0];
    return eth;
  }
  function wallets() {
    discover();
    const list = [...found.values()].map(d => ({ name: d.info.name, icon: d.info.icon, provider: d.provider }));
    if (!list.length) {
      const l = legacyProvider();
      if (l) list.push({ name: l.isMetaMask ? 'MetaMask' : 'Browser wallet', icon: '', provider: l });
    }
    return list;
  }

  function bind(provider) {
    if (!provider || provider.__togBound || typeof provider.on !== 'function') return;
    provider.__togBound = true;
    provider.on('accountsChanged', a => { if (provider === active) paint((a && a[0]) || ''); });
    provider.on('chainChanged', () => { if (provider === active && connectedAddress) toast('Wallet network changed.'); });
  }

  const CHAINS = { '0x1': 'Ethereum Mainnet', '0x89': 'Polygon', '0xa86a': 'Avalanche', '0xa4b1': 'Arbitrum One', '0xa': 'Optimism', '0x2105': 'Base', '0x38': 'BNB Smart Chain', '0xaa36a7': 'Sepolia' };

  async function connectWith(w) {
    buttons.forEach(b => { b.disabled = true; });
    try {
      const accounts = await w.provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || !accounts.length) { toast('Wallet connection was cancelled.'); return; }
      active = w.provider; bind(active);
      paint(accounts[0]);
      let name = 'EVM network';
      try {
        const id = String(await w.provider.request({ method: 'eth_chainId' })).toLowerCase();
        name = CHAINS[id] || `Chain ${parseInt(id, 16)}`;
      } catch (_) {}
      toast(`Wallet connected on ${name}.`);
    } catch (err) {
      if (err && err.code === 4001) toast('Connection request rejected in your wallet.');
      else if (err && err.code === -32002) toast('A connection request is already open. Open your wallet to approve it.');
      else toast(err && err.message ? `Could not connect wallet: ${err.message}` : 'Could not connect wallet. Please try again.');
    } finally { buttons.forEach(b => { b.disabled = false; }); }
  }

  function pickWallet(list) {
    const modal = document.createElement('div');
    modal.className = 'wallet-modal';
    modal.innerHTML = '<div class="wallet-sheet" role="dialog" aria-modal="true" aria-label="Choose a wallet"><h3>Connect a wallet</h3></div>';
    const sheet = modal.firstChild;
    const close = () => modal.remove();
    list.forEach(w => {
      const b = document.createElement('button');
      b.type = 'button';
      if (w.icon) { const i = new Image(); i.src = w.icon; i.alt = ''; b.appendChild(i); }
      b.appendChild(document.createTextNode(w.name));
      b.addEventListener('click', () => { close(); connectWith(w); });
      sheet.appendChild(b);
    });
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); removeEventListener('keydown', esc); } });
    document.body.appendChild(modal);
  }

  function onClick() {
    if (connectedAddress) { toast(`Connected: ${connectedAddress}`); return; }
    const list = wallets();
    if (!list.length) {
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        location.href = `https://metamask.app.link/dapp/${location.host}${location.pathname}${location.search}`;
        return;
      }
      toast('No wallet detected in this browser. Install or enable MetaMask, then reload.', { href: 'https://metamask.io/download/', text: 'Get MetaMask' });
      return;
    }
    if (list.length === 1) connectWith(list[0]); else pickWallet(list);
  }
  buttons.forEach(b => b.addEventListener('click', onClick));

  // restore an already-approved connection silently
  setTimeout(() => {
    const list = wallets();
    if (!list.length) return;
    list[0].provider.request({ method: 'eth_accounts' }).then(a => {
      if (a && a[0]) { active = list[0].provider; bind(active); paint(a[0]); }
    }).catch(() => {});
  }, 400);
})();

/* ================= 3D LOGO (masked layers: lit front face, solid extruded sides, moving shine) ================= */
const stage = $('#logoStage'), rig = $('#logoRig');
const MARK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQcAAADrCAYAAABkWlPqAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAAsB0lEQVR42u29eZBd93Xf+T3nd+99r/fGvlEEQXEVqY0AKZdES2zHpViMvIzHgJ2KkxmnUtYk40WJsnhGdgGc8iSxquJYzmQcOuNxnIxnZCBeJNqULVkCFIoSKQGkuIAUsQNNAA30vr/37v2d7/xxby8AQS0ACHY3z6eq2ei+D93E7/3u955zfmcBKnbv3q1wHOctD0kBALnsm+0AePn3Hcd5a+gCABGRGQCQvXsZdu4E+7818k9rHbI7jkhUaCgEUBIQQhfLBavPV/p6pV77Tv92v/bW2AMrbF+ZlF8EAmLlnwuxmG5kqLP2W53b2vdIZTG0XXhycuZbXz6O0MiQhTpIArDqs+M4K8tEUABS/pcCCpBLE9I5i75d90G3YX0y71G0OFEPWXet1mGaUyEENAEt+Eo6zkpDyoe/GgARUBSqoCVRJqenih50WjKvJIEBBBgplNKdoBFA9IV0nJVmOZAQGEwMYCh9DVKCBVAkAMD8CQWl/I9QQQCkAvQDDMdZmSgMoXIvOG9MiCXV9xaJg+M4zqXy4TiO4+LgOI6Lg+M4Lg6O47g4OI7j4uA4jouD4zguDo7juDg4juPi4DiOi4PjOC4OjuO4ODiO47g4OI7j4uA4jouD4zguDo7juDg4juPi4DiOi4PjOC4OjuO4ODiO4+LgOI6Lg+M4Lg6O4zguDo7juDg4juPi4DiOi4PjOC4OjuO4ODiO4+LgOI6Lg+M4Lg6O47g4OI7j4uA4jouD4ziOi4PjOC4OjuO4ODiO4+LgOI6Lg+M4Lg6O47g4OI7j4uA4jouD4zguDo7juDg4juPi4DiOi4PjOI6Lg+M4Lg6O47g4OI7j4uA4jouD4zguDo7juDg4juPi4DiOi4PjOC4OjuO4ODiO4+LgOI7j4uA4jouD4zhXQ7L4C6Eh0EACFIC+Po6zIhEQAqK8y7W8300AAebu/AVxICESISwgVOSiMAXC3F/g/E+tXn+Fr1fqte/0b/drb409sML2lbAUBlOAEIAKCkGJ0MvFoQiCVhCEREEKWoFQEonxUhPicnPCr/k1X4dld81EEEVBUSgEygAlIabQGC4VhxCBEBOkRQpQy59AwoQQGihzrkf186/w9Uq99p3+7X7trbEHVtK+UgoAhZIwAsJSIAyorIfLLIeUgtQEgYJghORE1DmzI8ybRi7Gfs0Nh2V6bdE9rKUqQGUh3giJIFjaBovFIQ8ReWgiSRIUBkQtQAQEZtUPL90LqZwZkpX7svD1Sr12pdf5NXlL7YEVsa8W3cPUHCYLryRKb0EgkPLCgjhQAqB1RKZINCCygGj1y8Rcjf2aWw4r6prOn1kAAlODoQBgYLBLxcEKIEZCkCDmgIYMiAZjMa9CjuOsDJSKQEHUUiIgBSg5IATtMnFAlidpT4Q2G6JGMFHESCiC5zs4zgojMYOAUFFQDJSIBAbpCkjrmSwWhyZqvNVWRa3FyGarIWgDmrO+iI6zEmkAAGYBtFWfK9oAqRUEslFfJcdxrsh8MIGkBxYcxymFQcSjCY7jOI7jOI7jOI7jvCF4EPIN5PWCvB7scVwcnCty8CBTANh+pYvbAeyDyS6JvlKOi8MKtBhEhCS7APQACy13NOirtO9uOBw8yHT7JHio65CUmrEd2I6isjoWt+5wHBeHZSQOqYjkM+can4SFXx8+PWXtbYnWNyXgJD7TbOqX0iwLqohABDQHUiCt1y1bBwXwtIi88D39rr0MB9aV7+NDDwEAorstzvUg8SV4AzhUfmq8qjZ4fAJnXj5bdNSyTCRH79ren2nvXv0zogIVA6UBI5FkGepdxKotgrHR1uDQk7MHc2moZdHaOmvWs7ldtUt/EcD5xZaDiMy8RjAqtwXbQREp/A1xXByWHCkYEyR5B5KYQCxgbHwmDjI3o4IWIToLlRRAAANhNNQ7w7q2nvpHInIgI7L2BBOrWmjlzZe0JoWxJe1dnVy9oRs8wZ+DYLIJoHYLAOAvRSS/opWxm4o9i8xGWVSL7zguDjeO2WQWrTRHkUTkokgUUCQhkSwYAoQRiVY19XNtvSBgw2xmtmVg2U9jli2MsYWQSBbVMlMgZCMY6JzB+s1r/ohpAWSGjbEHoyMTXzj3tZFTGzatClrHUdkkvyECkIA8IoZHLrMwyqioiXgA1HFxuHGLWyhqRYKkUIR0QQSEEVADQDBK1dtPFj3RVSHlTBG97C1SAGYAGxEzsw0cO3+6gBipkONPnuXaDas/nGQJ8hPTyLpTnHhs+BeKJNrb7uhVZfqrWR3PYQsCgBERObk4doGd80HOOZfFYxcuDs4bQTAgWNlUY/7Gp1QNR8sDDMp3jgnzCocSZe8eRdCALMuSsjFg+brZi3lRxCaHigkgiUHai5skUUwcnUHPus7/xMywZlMPpMPGBp6Y+s0Nd3QkaMdXpUu+ePnv2btzb9j5L3bqolMSx8XBWQ7M9QdcfKppYokkQJYmAAOkEUgBGpM5ps8NW1RDfxhCvSvrXb22+3+TCUWBVrP/z4efX3d3V1ZrS38TGb6ENUhE5DT2IQLAwUcPptt/fjvhpyEuDs7ywsygqmVnH7IUDhMIayIEUiGSlAEKkAVssuDQ2GgxcGQIWZbVsrb0/pGTs+hc1/EHedrCxtu7MfD81O4Nt3ScQxf2isgEPrZImHZT8RAUD7lYuDg4SxpVnReJ+e8FRTSrDj6tbBRMAxkhoiJB00wzKBI2p4zNqRmMnBsViMrFw2Ncu2XNI2GgjrGZ0V945fMD59529zpp26r/AMCoiMzgERhwSWDT3Q8XB2epISLz1sOcSJBWDSippqoQgGj5UQ4eAEQQYxQRSBBFqh0QJOAsZeyVyWLwyDjbV9XeHTrs3WenRjHzjYmjG29ez4GvjX1iwz09p9GNL4lI6xJ3Zzd1D4BHHvGjUhcHZ0nEH0QWzS2oAp2Bc9nWWk0yWzxYPQJiCNXJCagwEQAGCQJJNMkQkE8WsZgip88OAwFtjVcuomdz2++k03WMNMa+fOaJkeNve8eqgNX4uIhMSiUKL+59MRtcd4/19XkilouDs/QsCi4WA4KYG21YCYIAJtVQ1cqqEJanIUJAIRAiQAxtaR3RcsRGxOCJRuw/2m+r13X9UL2XP3R+pomx2ZGHp0828vbe2j9BL/6biFwELjkm9SNSFwdnyVgUc5OPqgnKkIj5I1TODTUpB5wE07lXw7RAVCuPKgKASBgVIgEqAZEIHbVaaI4WcWZw1oaPjiHp0I2TZ85hw7a1+4q25uGBbzX2rbq5dkxWyx9e8v9Uxig8PuHi4LyZzA0tKWcgWpVfgfm8CIGWQ9AoSKyMTcwNTxYhDAaCCJrCEEATKBWiLUALwCRkkoQgAXE6Mp8tcGyg37Le9J4NW5N7zh8dxJkvj3xi3ZaO0/U12S9iDUxEzgHA/v37k76+Pnc5XBycN8eviBAqhApaKF2G+aSsOYEgTIBWEiEmUAiCpUgKraYhGQyAKWBKEK3SwohARAQyIrIFgUgiQDe6QhwrbGh4pKDENK7newdPT7y3Z33XT3RtySY5zH+C1fivIjI2b03sZ+LHoi4Ozg2NOSzMYJ/7M+UKkxSrA425e7MMDlTHoHNDWGFlhicEKjKfqQmyPEIVABQYCNWgQSQDMs6O5NYaa2L41KSGmnTde9/t/7HQ/JdHv5H/ee/bkl/HRkQRaQAQksHrPJYG6kuwwsVhccsOsSt+zOlHGXnAvIBYsDLuoAYqgUoQQlUjspCgKVBJIAgAtAx7Cqu/GyWIaDvbtcu6UZ9px0v7T7TOPz967+lnz//KS0+cuTj43Niz7OfDmgpFJO7evVu5m+qzVN7sveNcd3iQqeyQfOipxv8ydrT1L88dHmxlWcjAAmIKk1CNP+dbQp3FrIxhIIFqWVvSis2Yay5og0od2HbX29De1f542hv+a8+75Pfn/u7BRw+mOz62I/dd5W6Fs0KtFxUFCFgkBIJU6yFYBjaBopHz+NfO5atX9z4svXj42X2v/tr6jd1/b/rBgW/eIXc09+9nMji4jzt37jSPSbg4OCsIA2BQaBCYlbELFYWqwiKRIpGaZFljeLZoDDaT0JVsm55pe6JxPPnrp//g+T9+X5/8h8Vas38/gydWeczBWQlulipMBQUMpkAMgkIjcilgIQJKGHNokKSuCbLZwIsvjUa72P7DMtX5O1/9/ecPXXx+ZD/JmwCwr08KHmTqMQm3HJwV4VpgPjWbVbwFQtAAChC0PBZVTQCDpFkSpiZmIiaAesfq+05+cQgzZ6z/1a+PPLrlnav+RDrlC/Pi4yccbjk4y3STkVAaghFKIFS5FmIBwgBhAjADrIZCBHlSuiIZEGpkKKZaVowkduSrF23kRXzsm3964vMjz07/BcnbRAERifv30x90bjk4y9CxqE4ryswIEpekbQu1NB/KOg5Qiiqn02BaZk0oauhKOjF0bLKQWkzOTI48PHpq8m8MfmP8z9a8vft3ZZV8GZhvoksPXLrl4Cwjv4JVkhSgpeUwl60pBCSCWkBoCFbmWeQBKCSUzzASMU6jvV2S1BLO9Ofx/KHx2tGvnvvpkednv3TqC8P/ACib6IoI59vzOy4OztLFRFBIQBRFFCnLM6UqBtMCpi2YNmA6CwstUAClIsQUwZIyyQpAygDLI1IEkWAh0xrixTS+8OUz8czhgf/4zN5jp1pn+EGSbbJDcu5n4kFLdyucZWA5zPWdKVOxpUzKrsrF57Ivy1TtuSa6c04Jq3pvIojCaKAICotItBbEAoqxFkcnpreesuGvhA7Zz6P8Y7ld/j1QjRZ8DFG8+YyLg7PkdAELEYBLm+KW9R7hypGKRWEDzvWemBeSUAlNjgCFxkzqVuO5Zweta01738vDM33Tz8/8/fab235FesvO2tzPRDw/wsXBeau4LGWbf4GCJlKvdYSZiUYcm2lwbGLivtr68BhP8JewDX8qIoNAGbR0K8LFwVnhzNsWUjkikUhDPdCIfLywydHJ7LgNP9p1vO0fx1P8vG7Fr4nINPcyyC7PjfhOeEDSWQlOSyUTpQUBE2RsR2i0aVdcJf0vXGyd+ubAXa98+fw/brxSXOQYf1p2Sdy7d28gvfrTLQdnZT7dKFjUgQIUK+ObJkiYQCDoStqyONGykYkpjg9Otd/8wMbPnH9+hpve1b7XV9AtB2cF2w06H38gTKp2/MryAoGiKKAaNA21ECfBo0/0s//ps3907onJl0neT5ZZWPQsSxcHZwWJA+cCkgapGuhSC5hEWIigRkgAohosGBSp1JudaBw3nH5y4K6xpxrfaJ20P4MIpU+KvXsZfFXdrXBWlEjMDSZG5V7EyprQ+YiEgUg0AXNIu3YyTuR49rPHbP3tvT86+1LrxfpN6e9Kl/w2T7KOW9ASeWufaLg4OMucuSrPqqMlq+xLzInEQhtdZUCkQVNBzpaAgq5kVRj+9kTRmizuue2BTZ+efoWQbfLbgDe9dbfCWdYsFgZULfbVFGqKMF/1qRBTlFOEgSgGUyJKRG4F6vWOZHooj0/95Us89tTpT8dT/AuS90ufFCLCt+pphlsOzjIXB1nUan/eycDiEaFzidjGCA2KwsppX6Kh7JwNQBBCZ9KNi6+MxhPofLi+VR4k+bMA9ovI1FuxZ4RbDs4yjzXIayyJsqCrqtu45AMAiQCBQsvm25XfERCAPKAzWRUGvj1SHN3f3z31zfg5O4cvkqyLSHzxRWYuDo6zkgUFlxZ2LbI3AAJpWksS68TX/+Rw89WnR39g6rnWF0i233uvtN5Kx50uDo5zuatCIpMM3fVVtSNPnWmdOnTuB88+OfRXHOcvSZ8Uu3fzLXHfeMzBca4kEGZAVHTX12QjJydtZHzywbVr1j4Yz3Nd2CS/duTxI7XbP3J7ayWfZLg4OM4VCKKIZjAoEmlXjMb45P/7XLz3wTt+degb4+naB3p+pbIydKXmQ7hb4TivMRsARoGIwiQHNUKRhE5bkx3+8uli8iT+xdknJn+dZJuIGFdoVqWLg+O8DgtNagwmBoOgLVmdnHl+KJ57YeiTUy/kw7zAD8uuldn92sXBca6oChGAQWMCsRSFAq00ImoLGbLQeLUVX/rSyfrEqfwx9vMjfX1SkCvrqNPFwXGu4FdQi0ogFMoUagoRA6UBlRxtSVtoDpHPfel4ev7bU49NvcgfEZEWuXJcDBcHx3ltyAEGRaEC0wLCApkBtRaQxQQmRMNyZFmn2nSGI0+f0uHTQ48NPTv7YRGJPMJaWQbu4uA4K86vMAkgtGweozmUEUkUKBUiAVBFXuSoa01Co84Tz5yVmfONx8Zf4EflDmmKiC33mgw/ynScK4QclHPpCwEEUQggSdUFm4BW+ZVkgYR1ldmMpw4Nhu6RsT/jBH8RXfisiJwjmYgsz47Xbjk4zusIxEKKtQAicxP7LrleTvKKSBIRyZWDR0Zl5GDz/4xn8RWS60WkWK4uhouD41yzkhSI0oAYpVvX6LN/dbR59qmp21AKxEYRseV41OluheNcK2Q1EljBhmJVuq524psX8tk4e9fWD6zbP0X+UKfI+eVW9u2Wg+NcswsSoBZACkKqKAqiI+1M+58bjMeeHLhLTuMrnOBaEYnLycVwcXCcazEaAKgG0MooRF7kkMRAFuhOu8PA80P52acHb8cs/hvJLdUphro4OM6KtxqASMJUyxYyKojIYZoj5jl6Q3d67rmL8fgTQ3e3TttXSG4BIMvhmNPFwXGukYV5GQuCARTQQCASbdIRTh463xx6uXj7zMn4qIjEUwdO1VwcHGelWw9c6GMpC84GAEFBA0XQkbVnx795Or9waOqB6Rf4o9v6tjWWets5FwfHuUYSEyQxACBiiDAlyuSpAE0SRBqEKmGWycCRgXXnTwx8bviZxsNLve2ci4PjXLPloAgsU61zzRHnWl9TURQGrbpcJ5oKGmKvvjAQZy82Pjv1Aj8qfVLwCGsuDo6zEmMOaig0AhAkliKwGtIJgyjKphBUQAOUNc2aXXri4FmdHmp8Nj9V1mIsxTF8ngTlONcIq7b3gstmaAjLGAQBiMDmZ2+lIg3DkaeO810dd3yOw/xbskY+v9SSpNxycJwbbmUUSLUmmEzw0lePR0zhsyTfc+AAhFw6MQgXB8e5kVZGWfMJi0R71qUzAzle+cpAOvjU9N/v65MCgFsOjvNWRC0gMAGDYLZooLu9Jxl8abTI+/GL08/wUziKbKmcYLg4OM4NRAhIDIhiiCnRLHK0SWdy8mB/Q6bwz2Zr+DHpk+LI42/+CYYHJB3nRopD5VyUbWMiEMq6jFTbsxefOm694+0fHxwc/Mt162TyzZ6J4ZaD49zImIMQQEQwRbAEoJaJU4HaHI+YPZu/3461/TUH2SUi9maO3nPLwXFuqDgYqEAwhcYUFKKQCFGgFuo6dma6FbL0gTVrO75I8iM4jOk9YCGP3HgLwi0Hx7mx8lC6EwTUFGpaJkiJosgN9aQjO3f0Qhw80nhfq98+L/dKC3vcrVjxnmb55JjzORdvlwUvlIu+ev3t5SznnaBEmSBFQqlILUCiQDUgjxGd9e7w7adO5EMvzL5nvL/1vqoHRHBxWFEohIJgATBFAUMMOSARSkAkIJeAGAwWcphGRImIGmESSxMUdolYRFTlwXObjYCazH+ICUCpztMBIRd9YP415esUhoUP54bJAyhlQpRJBEGISCkYAmhUhJiFM88NJO2T6RdJ3nvoEPRGC4TviDeQCIPRIBQoQhmZ1vJmDyaQqKWlEAVaKDQqEpYtx4ShLAVe1AeZAJSKYKG8wVmZqWKgxKqnAF/HspBFlsvlNotVH86NEgcAoBJUK/eEGEhCRUEKamlNZydynj400jX09Zmf2bFDcuy7sf+nHpB8AzEtIMFgWj3/TQFJIKYQEyRKkAa1FIkFQCrHgixv8upjbk8RQKAimFaWxdxrIgyshCSUPmylBBS9zBkxQOcGxAI6n5Cn/qxYSnvHDG31WnLyldPF3atv/WTjGCfxdnyK+5lI342Zg+Hi8EaaZSwYpUnTgoaFu1xEIYECECqGGAoUIUJE5l8FGmTRs12rm78ITeRJUbYksxRqCZQpQvVqCmE6JxwCMCyyFioroSoIUpblxpfGQ5wlZHqiQ9vDiYNnGlvufOe/xgyOSJ/8KclURHIXh+VtQCa1tCamo7WQZRBV0AiBoTnTykWByAggrT5sfnCKiCRQk7kA5bzRL7yk81ApGQqp3A7AoAZADCbl7yIJE8wLQykEAjJcIg4Cc4FYSlAQmIgVSJ/5wmm7+QObf57kF3EIzVLKhS4Oy43t5X2atIWxtKd4tWtzLdfAlMFEBFRKfeuGm9YWjYicBdgg4iyQFwUslrf70PAoipblGiBAIAmIIEklkcQSEGXQkUoUKHsJCBZalokFBDFQrLI6yrLiyDJgKdDK7ZB5geB3OSVxbvTDpQwaJ1ILI/3jtvb8+h8ZynDnuh3ZoZ0794Z9+97YIi1/TrwZDwRyPWbxv89eAKcbM5JPzmBmdAqTE9NgoZqgbr3ru/7u2u61tZH+BqbHGoAlmBifhM3mQB5RFIZIIyREEYEEDSIqjIYgAhHAioiUAWRpRUCkCkfIQhADi2MSfKMfRs73t1MAGkgBgzBPWsXtH3zb8Ob3tH30wLMHnnvooYfsjUyvdnFYugKyHcD68W8UvDA4GjKpWe8tbf+uOdrcdO7kRbAg6qGjPZ8mipmIiZEpAyUGKESRhiRBQIDkC2+xkVBFKRKMKKMeNr8TSgvCt8RSEgcTg4hALUErz/MNd/em697V8R9Wv7f+D198kdm990rLxWFl3fhyiUt3aNGnQ4eA7duxY8drA04kMwDJ0BBCq3Uurmtt/nhzPD544tvn4rrVaz7K6YCpoSlcvDCEopFDmBCSMogCRs1CVs5ZiBFSDYA1KUoDQoBgmW+JJYQBkFC+XxlSSBQ0ZDKufW9Pcdv7N3883YRHsQ8qu96Y7lG+E5augAQcgBwAgAMHAAB9j/S97hEWp/mTjdNYfeHUcFtHe+23h16dQtE0TM80UTQKNCYarYSZZJKlKgGw0oUwzJ1soCwE8i2xlJwKGACFIBggRiCNbNSmZNuDNzXe9qE1bW/k7/eA5FINRn3HXoJlpLrKmJNDv3tIpEP+ZP7qDP9MVnUSzcZdiPKpi68O1rqSTe+YujiDi6+ORM0TSSQR0QSCRBayMJ0ltgsgolXD2gIIBhYmoagVo9/OpXWE/zm9Hb+MA5jEQ4gi1zdg5OKwPDcNLxcQkgkOQQ48Bkq79FfffhXAfSTTxvP4ZJ5M195+y/pfGT03jenBBpqTDUiRFVnSlpQHHq2qWaqCBJQCzmd4SmllqEBUypMNlunZizczRRbJDLHwlVskV/cuE5EFVA0EESRBwjQZPjVKTGz4u5jGH+EhfB5AKBXE3Qrnu8c0Si7zSZuvTr2HMfunrfHWh86+OLo+zLZlZ48PtRIkGoAgqiIhoIiEVhkUIKBSJnCXE5zKPAmRKqdikT1DhCqnohQOdXG4xjdTKrfPypR7KpSClrZoHQXv/KHNRze+v+eu+P9ZuN6xB7ccVqZLsvhxHknK4X2H08Zog7WbOr8F4GcBgAP8cUzh72x+b+/O88eGcfHoBPLpJjMJlmkIkQoTRcECFEMqCi0EagExlFkRZaJVlViFuXkNpRCUIxvEE6uuQ+xhMRFEGmoyPjOFC6fH7hw92voxuVU+x728rgLhb9tbz6pQESHL3EpW33v44jfH6sVM/L/HX230zA5GTJxvtupZlgJRkESYAFYIAlIIpZzqJFalYbOyGmReJKRyS4QLcx2ca7EcYrnWVVGewVDUmpxNJvIf+NH3hq679G9KKl8imYhcn9oLtxzeelaFVaGu8kRkHyAij1ci8Zcb+vE/t4bsp6YH7YFjz5xBY3yGdckQRCVAYCLV7Me5tO3y0SZAVRHKS6wHqbJ8Pdx5fSwICkArfbnEUtE8k9PPDIQ7081/h+TXcQAtVnmvbjk4177p9jPBIDhnkpLMMI2/d/GFqUeaZ3Xzqy+fs3yiZW3t9aSIhElAwnBJQiUVMBCmNi8OgWXfCLccrk/MATAoy94gKgEmhiK0MNUct/f/yHu0+4N6G4CT2ANcj7Zy/pY5l7sd8yPZSK5FP348Nvh/nX1uCie/dbYQY8iSGhSJoBBoNWreUPYmsBBhsCqpaqF3gXP9xEEY5ktoo0RAo2WrFLd+eN2BNfd0/o3r1bXa3QrncrcjkhQcQiIiQwB+j01O39zb9ZPr7rlr59Gv9WO4fxzakqKetScWA9QSBCqilacaVIIw2KK6QX8KXY8neFUgJywL51DGdRBVWhPRBo/N3MdB9onI/usxd9PFwbmSQBBAXh2Jqoh8BsBnSG6/Ldn0e10nu++dOT+VnD91saglbUla1CCWVk8zQrnQV4ouDNfnPaEsWk1eUkErUClmW1YMo/fC0ZmfI/nU4X2HI65xtJ6/b8734mpcEgHnFD9qF/Czx18499MnDp9F1my3Gjo0YSiDZbK4L4TOb2jn+8eqTh1lOf7c+1EFJ1UW+ncpMRGn8zt2bEluvrfnXfgveAn3QK7laNPFwfleBaKs8xZw/gj0LP/N6PnJf/jKUxfbps428s60M1UKwFhJgc77zL7TrlYc5gvsoYb5ZkBkme+gIhAhQCI3mK5q6rYHeh/f8sFNfwtkddHFwblxQlEege6SSLJ34vniCzYW7n/myy8gbdVZ17ooQtlgt+qUPdddGZxzNi51OOa7ZfvyXrrWi27U+dtcyvR1I6uuYWVn8UhlLrNYf0fd3vHRW3bIKvkWSbnamguPOThXE5MoTzP2MojIGMkPYxI/dVtj078ZebnZPdk/22pv68hEpOxHAEXVrGre5SCJxQ3qymIRLvKvncvF8tJeoICKzF8gAFWR0GrLdaw7efUbA4+Q/O8O7zucAGhd6+92nKtyN+aeTGzxB5rH7AsXXpnsOv5Mf1FHexKYlhmURhRiYIKqsKt0ToIp5npbUopqSwZf2KtwP4xAFhJMt8byOz9wc2PzXV0fkdvkyavNmvRDaOdarQiSFJ5kXTJ5qna3fvjmD/X8223v35xM6TgjW9CqWCiEBBBBYWUj/VIpFs7ty6xL52pQCIIkaMUG0hQ6cGK468KF0V+qyvqvKufB3wvneloR88k3vMB/Pn2m+I1n/+qVpk6nSSJZYBCYAoURiQRoNZ0LEAjj/MAfim/LqwlOGBJokgPawnSzybc/sElu+bG1t4vIsauJPbjl4FxPK8JIBh5hTTbIpzrekXz8wf/hnlrH1vYwrY1YVGMAMwo0RggKQHKYFDCtLAl6GOyq158RNEEsgDap2dipmWLo4MTvAQAOfP++mouDc70FIsod0ty9myod8ml04cO3vG/TZ7fetzlMFmMtVSJhQIhSTvZSA0MEteqO7ekQV7nwgCpBA4LUEahImrXklSfPg0dYO3TkkFzFj3ScN8jSnRvdJsDMkeKxCy+PffSVJ04Wq9N1IUgqhRqi5ihgUBMEJlBR2Bs7jmEFWw6ESVnPEsxgZq3Vd/Qmox2DP/cDu+78zwcPMr1S42K3HJwbv1n7pCCZ7P2jvaHttvATt+xY87l3992dNLOGNJkbAcRYjeZLgIgmDLkv3NUGHVBNUoeCCKBIMjIwrr3J6n/EQXZtf6xs/OPi4CwVN6PYuXOn7dmzh9iE/37jAx17197TfcF6mzrDSQshgcYAK7QcF+i27NXLA1klRBooCg1Bm1MNk+n0fSOnmj8oj4jt2bPHxcFZUgLBPXv2cI/sMVkrP13blH5ozR3t/fVVqkVrpmjTGrQIUGQ+zffa/IoyX8TmyrICEmSYvDAcx4bH/z0A7MGe7/nHeWjYuWECAYDcz0QelFdOPHnuBzeFnqeH4/SG2eGGpUmHggVyi4Bemi5MAWxxewIqqiHlZSDTASAQDRAoKESUvGxrLwrMMLz68sXW6SfGVuE8JvA9VsK55eDc8DjEwUcPprd+YPPp1W9v/+Dqu1f3ozdogbxAjAgi5VxPEFIWeFZDgIlCDblWw4Ep5TwH14YFzTQFrTplEAKSQwHNJ5Fvbt96x/jZiU/ILolHPn0kc7fCWZLs+NiOfP/+/UnPO3qOXLSLH+q5NT0XeoukkGiKgGABgJTHnBpBIySGqgtSuWVN6NWeV1SI6sauMk6NRJplyeD5odjb3fO3OcKb//CX/zAn+V3vfV9a583bx1Ur9Rc/e/S25qj8xWR/cWvW7NBgqhZaiJJDRaFFAmECEyBqBCRCKAiEZ1O+ZlHL/g+UubloZSFbk424/q7usP7d7Z9Y/c7u36pcPXNxcJYsJ0+erG/btq3R6G99fPQI/u3zXzw6syrpbW+hAYYIlQAtEiQxBSGIWsA0ghKruRg+GXwOq0q31QKUhClhCkQWCEKiXvDm96/Pb3poTd3dCmfJc+ut2xr79+9Pajelv7/mzvCn23ZsaJ8sxgsJ5Y0/d/Nb5UIEhnLyEzDfK8KZ8yfi/DO/DOiWYwQYSgtCZzMZfHlqiuStJOW75Ty4ODhv7pYm0NfXV4jIeNst6U9uuqfjz7e8c23SjDOWWoq0yGCMiKGFqHk5Ys+CByJf601goaekQFi1liudDIiJSEtjT7ZmzZmvDv6GiPDwvsOpi4OzDESC+quf/FLSeVf9J3q3df5x59qOwqyIAgUCEUMB07yc/CScb4nvXCFKwLLLFuenDZW3etAQzp+6WHSmXX0kf+SenffkVUn3FfE8B2dpbOuyopMiQlH5qROPD/D08BBpQkrZGYaw8oRizmpgcIG4kjiAWFQND0UAGGAQyVsts/Fkzeih6WT1jk7yUSpep0u1Ww7OUhIIkgwWLdxy//pPvONDt0ojnQZhLINsClODaQSoUFOXhrm1m++LgaoVn5VWlhk0CiAJmACaMT3y3EkWiLtJduLnUbxe7MHFwVlqAhEPHIDIGvnN3q31X1r39tUzsYhFFlMGCzApUISiGuzisYdLfTPFXC8tE4GpQaQskbcoKCSHBJE4TZkcndkBIPtODWBcHJwlR1+fFNzLkN0u/27Tu3oGezd2pXmrsIAEUjVTLZ+WvlZXcivK8XllrKEcFaBVj86y7iJlhrPHB1onTpyI3Pv6MQcXB2dpshMkmax5V8euTQ/0jtk6hgJmaV5HW2wHhciTltdpXXIzsxKH0n5QJiCkdC9CAaUiQQ0WGVfHDVl6rOdR2SXx9bpEuTg4S9W9MOwDReSbtY3tP7zqlvYLlkUq1FgYwLnhsm4+XOJZyOWWhFZdtlg28KVCBDI91Ig11H+Q5Af2DYJXSqd2cXCWrkDsknjwINPerXJo052dT3ZsTtDSJiERQQUWfRLnVa2ris42ZossqW+eON68f9cuiTj82pNLFwdnSbN9OwqSuuqdnf/TrfdvCLNhIsQQAUpZjux8/+JAQSJJOPFyv82MzD5AsmffS6/tEuWr6yx192LOPBjv3JL+q9vvv6nZZF5YJFIEtxuuxvUAEZI0mbg4jfWdvX8bwM27yoG7Lg7OclMIGA7AZJ38r+vf0fu13m2rEgMLiZzvVk1vW/19LahQgUJx4ltj8ejnJwcA4PImUS4OzrLYyngIRlKyrfqvVt/W1WjoLCACqbIAQ1gIuLtQfA/WA4kUGZoTrXDz29t2XymN2sXBWS7uhWEfVFL5Yte67H+8+/5bk9liuhABLNrlr/UF+66CqxAEtKZyXDg79hMiEve4ODjLlp0gX2TW847w1Y6N6aH62looLMagAUUsqu7LLgzfK6oq0xPTFqck5Sz/5iN7wMUWhIuDs7ysh/Lz2Z4tYe+Wu9a3ilhY5XrMC4O7Fd8dowACKQqLXVnvehvBLgLAYbg4OMtUIO6V1t69e4PepJ9q3xTGetZ0hCJGEy1LlElC1RvPfteYg5Sjt1UEoxcmeOTZgbMiwsMvHXa3wlnG3sXOnSSJ1Vvb//mm+9bpLGYgJhAYImIpEBagFBABhuBa8RorzBBEECRJRs4N2dbNa36W5L37Du8r5rIlXRycZfngIylYg8c6tiTf7ljfhmi5KQDV0skoXzU3JI4uDpfHG4QADUFSaUw1GVrpNgxg/SOPPGJzC+ji4CzH2AMBJCIy2tmr/8fd923lLKZyEggWQBKmEaaEIkJRDcBwFtQVCiNBFYgEnDk9YBf7RxoAgH3uVjjLWSBU8oMHmWI9/h/pbp3o3dyRmTEmTCAsG8IQVWNVmmdSXk5hkPnbX8LY8IR2run8A7IcF+Di4CznRx+2n4CJyHjP+rbfWnNztxQsxGKECGBqiNVQWSEhfoJxufUFEQGrEVnNmQLj52c2An5a4awEdpZZk9iE3+nc2DGcdWVqIKECUgBRcL4RrW/1S8UhwKyqs9AEsakY7B9rikjLxcFZGbGHslGJrl3V8Y9uu3crGtYsyqbsYaHDqneqfq3hxTIgqQqIBSAP1p50tXGMP1xdVxcHZ3nzUNl3ElvA3lu1mdfysncipWyRBsAU8JZRlwkryroUQwQpEmdpdWlvnxpo/bPqJcHFwVnu1kNBMkUb/qTVZl/deu+mtJHPFkkViCxb2jtXRAmygIgglQzjg1MYOHlxBAAOHXK3wlkZRBGJbZv1X6draQy5BgqUBhOWY/P8KPNyv6IcsgtCIAiaQfIA5gvt4lwcnJVgPRhBkTb561p3ONSzulNRFBZQTuSmGAQuDpc7FgTLkncSypCMXBwpNm/Z+KOc5o/v2IHCxcFZIU9CKPcybFzf+wtb7tiAGUwZVaAmSFimCzuLlitEQAxKQTBCpEDOghPDzbbRk+OdgNDH4Tkrh10wjCN0b6qPsyu0501hailIE0OsCrI8MAmUsy0UKUJMoKKgkkEU02OF5W2SAz4r01k5rkV8/PHHaw/3PPz1kYP5Z2669aaPHXv2tNWTjnKcQyAQC3i55pw6JBAqEkYoBRYgU/lUMFmjCNrm4uCsKJ7+yNM5SZk8gk+vfnf2w/fd+baNjACoMldNpC4OAICoZQ5IGgkxAUGL3auEuT7VLMa+QDK4jeWszAcjmVUPPx9u8T0uWbVOs9VAY18zZ0UKgwfar239BAD+f8uGy1PCLXZLAAAAAElFTkSuQmCC';
rig.style.setProperty('--mask', `url("${MARK}")`);
const N = 24;   // slices of depth
const sideCol = t => {
  const a = [34, 10, 66], b = [132, 58, 212];
  return a.map((v, i) => Math.round(lerp(v, b[i], Math.pow(t, 1.4))));
};
for (let k = 0; k < N; k++) {
  const d = document.createElement('div');
  d.style.setProperty('--k', (k - (N - 1) / 2).toFixed(2));
  if (k < N - 2) {
    d.className = 'ly';
    d.style.background = `rgb(${sideCol(k / (N - 3)).join(',')})`;
  } else if (k === N - 2) d.className = 'ly face';
  else d.className = 'ly shine';
  rig.appendChild(d);
}

/* ================= HERO BOKEH ================= */
(() => {
  const host = $('#bokeh');
  if (!host) return;
  const cols = ['rgba(255,205,250,.55)', 'rgba(214,140,255,.5)', 'rgba(120,60,190,.65)', 'rgba(255,170,215,.42)', 'rgba(255,190,140,.34)'];
  for (let i = 0; i < 44; i++) {
    const s = document.createElement('span');
    const size = 6 + Math.random() * Math.random() * 46;
    s.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;--c:${cols[i % cols.length]};--b:${(Math.random() * 2).toFixed(1)}px;--dx:${(Math.random() * 60 - 30).toFixed(0)}px;--dy:${(Math.random() * 60 - 30).toFixed(0)}px;--t:${(7 + Math.random() * 9).toFixed(1)}s`;
    host.appendChild(s);
  }
})();

/* links that point nowhere yet should not jump to the top */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href="#"]');
  if (a) e.preventDefault();
});

/* ================= SCENE CONFIG ================= */
const ORDER = ['hero', 'problem', 'how', 'signals', 'layer', 'surfaces', 'final'];
const LABELS = ['Intro', 'The problem', 'How it works', 'Six rights', 'The layer', 'Surfaces', 'Get started'];
// pose: x,y as viewport fractions, s scale, ry/rx degrees, o opacity, ex = layer explosion 0..1
const P = (x, y, s, ry, rx, o, ex) => ({ x, y, s, ry, rx, o, ex });
const POSES = {
  d: {
    hero: P(.5, .37, .82, -32, 8, 1, 0),
    problem: P(.24, .5, .9, 372, 4, 1, 0),
    how: P(.5, .5, .75, 720, 0, .14, 0),
    signals: P(.5, .5, 1.3, 1080, 0, .1, 0),
    layer: P(.5, .52, 1, 1474, 14, 1, 0),
    surfaces: P(.5, .5, 1.4, 1800, 0, .07, 0),
    final: P(.5, .3, .62, 2120, 0, 1, 0)
  },
  m: {
    hero: P(.5, .27, .9, -28, 8, 1, 0),
    problem: P(.5, .2, .62, 372, 4, 1, 0),
    how: P(.5, .5, .85, 720, 0, .12, 0),
    signals: P(.5, .5, 1.1, 1080, 0, .1, 0),
    layer: P(.5, .52, .9, 1474, 14, 1, 0),
    surfaces: P(.5, .5, 1.2, 1800, 0, .06, 0),
    final: P(.5, .24, .6, 2120, 0, 1, 0)
  }
};

/* ================= ELEMENTS ================= */
const heroCopy = $('#heroCopy'), bokehEl = $('#bokeh'), hbGlow = $('.hb-glow'), hbEdge = $('.hb-edge');
const problemCopy = $('#problemCopy');
const lines = $$('.problem .ln');
const scrub = $('.scrub');
{
  const txt = scrub.textContent.trim();
  scrub.textContent = '';
  const parts = txt.split(/\s+/);
  parts.forEach((w, i) => {
    const s = document.createElement('span'); s.className = 'w'; s.textContent = w;
    scrub.append(s, i < parts.length - 1 ? ' ' : '');
  });
}
const words = $$('.w', scrub);
const tunnelPin = $('#tunnelPin'), tunnelWorld = $('#tunnelWorld'), tunnelTitle = $('#tunnelTitle');
const tCards = $$('.t-card'), tBars = $$('#tRail i');
const ringRig = $('#ringRig'), rCards = $$('.r-card'), rDots = $$('#ringReadout i');
const layerSec = $('#the-layer'), tags = $$('.layer-tags li');
const sCards = $$('.s-card');
const rail = $('#rail');

/* ================= STATE ================= */
let vw = 0, vh = 0, mobile = false, poses = POSES.d, secs = [];
let ringR = 330, sTop = [], xAmp = 0;
let ps = scrollY, mx = 0, my = 0, cmx = 0, cmy = 0, running = false;
let activeRail = -1, activeRing = -1, activeT = -1;

/* rail dots */
const railBtns = ORDER.map((k, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.setAttribute('aria-label', LABELS[i]);
  b.innerHTML = `<span>${LABELS[i]}</span>`;
  b.addEventListener('click', () => { const s = secs[i]; if (s) scrollTo({ top: i === 0 ? 0 : s.top, behavior: 'smooth' }); });
  rail.appendChild(b);
  return b;
});

/* ================= MEASURE ================= */
function measure() {
  vw = innerWidth; vh = innerHeight; mobile = vw < 820;
  poses = mobile ? POSES.m : POSES.d;
  const size = Math.min(vw * (mobile ? .74 : .5), vh * (mobile ? .4 : .62), 540);
  stage.style.setProperty('--ls', size + 'px');

  const sy = scrollY;
  secs = ORDER.map(k => {
    const el = $(`[data-pose="${k}"]`);
    const r = el.getBoundingClientRect();
    const top = r.top + sy, h = r.height;
    const a = top - vh * .1;
    const b = Math.max(a + 1, top + h - vh * .9);
    return { k, el, top, h, a, b };
  });

  if (RM) return;

  // tunnel framing
  const cx = mobile ? vw * .5 : vw * .66, cy = mobile ? vh * .6 : vh * .52;
  tunnelWorld.style.setProperty('--cx', cx + 'px');
  tunnelWorld.style.setProperty('--cy', cy + 'px');
  tunnelPin.style.perspectiveOrigin = `${cx}px ${cy}px`;
  xAmp = mobile ? vw * .03 : vw * .05;

  // ring radius from real card width
  const cw = rCards[0].offsetWidth || 280;
  ringR = cw * 1.1;
  ringRig.style.setProperty('--R', ringR + 'px');

  // layer tags around the exploded logo
  const rx = mobile ? vw * .36 : clamp(vw * .3, 160, 440);
  const ry = mobile ? vh * .23 : clamp(vh * .28, 130, 260);
  tags.forEach((li, i) => {
    const a = (-90 + i * 60) * Math.PI / 180;
    li.style.setProperty('--tx', (Math.cos(a) * rx).toFixed(1) + 'px');
    li.style.setProperty('--ty', (Math.sin(a) * ry).toFixed(1) + 'px');
  });

  // stacking cards: sticky offsets
  sTop = sCards.map(c => parseFloat(getComputedStyle(c).top) || 0);
}

/* ================= POSE MATH ================= */
function hold(i, t) {
  const b = poses[ORDER[i]];
  const p = Object.assign({}, b);
  p.ry = b.ry + t * 40;
  if (ORDER[i] === 'layer') p.ex = smooth(clamp(t / .55));
  return p;
}
function mix(a, b, t) {
  const o = {};
  for (const k in a) o[k] = lerp(a[k], b[k], t);
  return o;
}
function poseAt(s) {
  for (let i = 0; i < secs.length; i++) {
    const c = secs[i];
    if (s < c.a) {
      if (i === 0) return hold(0, 0);
      const pr = secs[i - 1];
      const t = clamp((s - pr.b) / Math.max(1, c.a - pr.b));
      return mix(hold(i - 1, 1), hold(i, 0), ease(t));
    }
    if (s <= c.b) return hold(i, (s - c.a) / Math.max(1, c.b - c.a));
  }
  return hold(secs.length - 1, 1);
}
const prog = (sec, lead, s) => clamp((s - (sec.top - lead * vh)) / (sec.h - vh + lead * vh));

/* ================= PER-FRAME UPDATE ================= */
function applyPose(pose) {
  stage.style.transform = `translate3d(${(pose.x * vw).toFixed(1)}px,${(pose.y * vh).toFixed(1)}px,0) scale(${pose.s.toFixed(3)})`;
  stage.style.opacity = pose.o.toFixed(3);
  rig.style.transform = `rotateX(${(pose.rx - cmy * 6).toFixed(2)}deg) rotateY(${(pose.ry + cmx * 10).toFixed(2)}deg)`;
  rig.style.setProperty('--gap', (4.6 + pose.ex * 15).toFixed(2) + 'px');
}

function update() {
  const s = ps;
  const pose = poseAt(s);
  applyPose(pose);
  layerSec.style.setProperty('--ex', pose.ex.toFixed(3));

  nav.classList.toggle('scrolled', s > 24);
  if (s < vh * 1.2) {
    bokehEl.style.transform = `translate3d(${(cmx * -30).toFixed(1)}px,${(cmy * -20).toFixed(1)}px,0)`;
    hbGlow.style.transform = `translate3d(${(cmx * 16).toFixed(1)}px,${(cmy * 10).toFixed(1)}px,0)`;
    hbEdge.style.transform = `translate3d(${(cmx * -10).toFixed(1)}px,0,0) rotate(7deg)`;
  }

  // hero
  const hp = clamp(s / (vh * .75));
  heroCopy.style.transform = `translate3d(0,${(s * .16).toFixed(1)}px,0)`;
  heroCopy.style.opacity = (1 - hp * 1.15).toFixed(3);

  // problem: lines then word-by-word scrub
  const pr = prog(secs[1], .45, s);
  lines.forEach((ln, i) => {
    const a = smooth(clamp((pr - i * .12) / .14));
    ln.style.opacity = a.toFixed(3);
    ln.style.transform = `translate3d(0,${((1 - a) * 46).toFixed(1)}px,0)`;
  });
  const L = clamp((pr - .24) / .6) * words.length;
  for (let i = 0; i < words.length; i++) {
    words[i].style.opacity = (.14 + .86 * clamp(L - i)).toFixed(3);
  }
  problemCopy.style.opacity = (1 - clamp((pr - .93) / .07)).toFixed(3);

  // tunnel: camera flies through four cards
  const tp = prog(secs[2], .3, s);
  const D = 900;
  const cam = lerp(-.55 * D, (tCards.length - 1 + .5) * D, tp);
  let best = 0, bd = Infinity;
  tCards.forEach((c, i) => {
    const rel = -i * D + cam;
    const op = clamp((rel + 1900) / 800) * clamp((320 - rel) / 320);
    const side = i % 2 ? -1 : 1;
    const ry = side * 14 * clamp(Math.abs(rel) / D, 0, 1.3);
    const pass = Math.max(rel, 0);   // cards that fly past the camera peel away up and to the right
    c.style.opacity = op.toFixed(3);
    c.style.transform = `translate3d(${(side * xAmp + pass * .9).toFixed(1)}px,${(-side * vh * .035 - pass * .35).toFixed(1)}px,${rel.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) translate(-50%,-50%)`;
    const d = Math.abs(rel);
    if (d < bd) { bd = d; best = i; }
  });
  if (best !== activeT) { activeT = best; tBars.forEach((b, i) => b.classList.toggle('on', i === best)); }
  tunnelTitle.style.opacity = (1 - clamp((tp - .9) / .1)).toFixed(3);

  // ring: cylinder turns with a dwell on each card
  const rp = prog(secs[3], .2, s);
  const u = rp * 5, ii = Math.min(5, Math.floor(u)), fr = u - ii;
  const angle = 60 * (ii + smooth(clamp((fr - .25) / .5)));
  ringRig.style.transform = `translateZ(${(-ringR).toFixed(1)}px) rotateY(${(-angle).toFixed(2)}deg)`;
  let act = 0, af = -2;
  rCards.forEach((c, i) => {
    const f = Math.cos((i * 60 - angle) * Math.PI / 180);
    c.style.opacity = (.2 + .8 * clamp((f + .25) / 1.25)).toFixed(3);
    if (f > af) { af = f; act = i; }
  });
  if (act !== activeRing) {
    activeRing = act;
    rCards.forEach((c, i) => c.classList.toggle('on', i === act));
    rDots.forEach((d, i) => d.classList.toggle('on', i === act));
  }

  // surfaces: cards stack and tilt back
  sCards.forEach((c, i) => {
    const n = sCards[i + 1];
    if (!n) return;
    const d = clamp(1 - (n.getBoundingClientRect().top - sTop[i]) / (vh * .6));
    c.style.transform = `translate3d(0,${(-d * 14).toFixed(1)}px,${(-d * 60).toFixed(1)}px) rotateX(${(-d * 4).toFixed(2)}deg) scale(${(1 - d * .06).toFixed(3)})`;
    c.style.setProperty('--dim', d.toFixed(3));
  });

  // rail
  let cur = 0;
  secs.forEach((c, i) => { if (s >= c.a - vh * .3) cur = i; });
  if (cur !== activeRail) { activeRail = cur; railBtns.forEach((b, i) => b.classList.toggle('on', i === cur)); }
}

/* ================= LOOP ================= */
function tick() {
  ps += (scrollY - ps) * .15;
  cmx += (mx - cmx) * .06;
  cmy += (my - cmy) * .06;
  update();
  if (Math.abs(scrollY - ps) > .25 || Math.abs(mx - cmx) > .001 || Math.abs(my - cmy) > .001) {
    requestAnimationFrame(tick);
  } else {
    ps = scrollY; running = false; update();
  }
}
function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }

/* ================= INIT ================= */
measure();
if (RM) {
  const p = POSES[mobile ? 'm' : 'd'].hero;
  applyPose(p);
  stage.style.opacity = '.22';
} else {
  ps = scrollY;
  update();
  addEventListener('scroll', kick, { passive: true });
  if (matchMedia('(pointer:fine)').matches) {
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; kick(); }, { passive: true });
  }
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); kick(); }, 120); });
  addEventListener('load', () => { measure(); kick(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); kick(); });
}
})();
