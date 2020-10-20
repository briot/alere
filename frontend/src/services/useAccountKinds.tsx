interface AccountKindsAndTitle {
   title: string;
}

const useAccountKinds = (kinds: string|undefined): AccountKindsAndTitle => {
   return kinds === 'work_income'
      ? { title: ', all work income' }
      : { title: '' };
}
export default useAccountKinds;
