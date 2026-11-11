function main(input) { const token={name:'slug',prefix:'/'}; const value=encodeURIComponent(String(input)); return token.prefix+value; }
