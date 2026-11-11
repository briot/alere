type Name = string|undefined|null|false;

const classes = (...args: Name[]): string|undefined => {
   return args.map(c => c ? ` ${c}` : '').join('');
}

export default classes;
