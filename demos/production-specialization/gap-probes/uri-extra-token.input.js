function main(input) { const token={name:'slug',prefix:'/'}; const value=encodeURIComponent(String(input),token); return token.prefix+value; }
