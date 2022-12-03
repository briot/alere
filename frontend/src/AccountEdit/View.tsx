import * as React from 'react';
import useAccounts, {
   AccountId, AccountKindId, Account, InstitutionId,
   useAddOrEditAccount } from '@/services/useAccounts';
import { useHistory } from 'react-router-dom';
import { SelectAccount } from '@/Account/SelectAccount';
import SelectAccountKind from '@/Account/SelectAccountKinds';
import SelectInstitution from '@/Account/SelectInstitution';
import { Button, ButtonBar, Input, TextArea } from '@/Form';


/**
 * Properties for the view
 */
export interface AccountEditProps {
   accountId: AccountId;
}

const AccountEdit: React.FC<AccountEditProps> = p => {
   const { accounts } = useAccounts();
   const history = useHistory();
   const addOrEdit = useAddOrEditAccount();
   const [errorMsg, setErrorMsg] = React.useState("");
   const [acc, setAcc] = React.useState(
      () => accounts.getAccount(p.accountId).getJSON(),
   );

   const onNameChange = React.useCallback(
      (name: string) => setAcc(old => ({...old, name})),
      []
   );
   const onKindChange = React.useCallback(
      (kindId: AccountKindId) => setAcc(old => ({...old, kindId})),
      []
   );
   const onParentChange = React.useCallback(
      (p: Account|undefined) => setAcc(old => ({...old, parent: p?.id})),
      []
   );
   const onOpenChange = React.useCallback(
      (opening_date: string) => setAcc(old => ({...old, opening_date})),
      []
   );
   const onIBANChange = React.useCallback(
      (iban: string) => setAcc(old => ({...old, iban})),
      []
   );
   const onNumberChange = React.useCallback(
      (account_num: string) => setAcc(old => ({...old, account_num})),
      []
   );
   const onDescrChange = React.useCallback(
      (description: string) => setAcc(old => ({...old, description})),
      []
   );
   const onInstitutionChange = React.useCallback(
      (institution: InstitutionId) => setAcc(old => ({...old, institution})),
      []
   );

   const onSave = React.useCallback(
      (e: React.MouseEvent) => {
         addOrEdit.mutateAsync(acc)
            .then(history.goBack)
            .catch(e => setErrorMsg(e.toString()));
         e.preventDefault();
      },
      [addOrEdit, acc, history],
   );

   return (
      <form>
         {
            addOrEdit.isError &&
            <div className="error">
                <h5>Failed to save</h5>
                {errorMsg}
            </div>
         }

         <fieldset>
            <legend>General</legend>
            <Input
                text="Name"
                value={acc.name ?? ''}
                onChange={onNameChange}
            />
            <SelectAccountKind
                text='Type'
                value={acc.kind_id}
                onChange={onKindChange}
            />
            <SelectAccount
                text='Parent'
                account={acc.parent_id === undefined
                   ? undefined
                   : accounts.getAccount(acc.parent_id)}
                onChange={onParentChange}
            />
            <Input
                text="Opening Date"
                type='date'
                value={acc.opening_date ?? ''}
                onChange={onOpenChange}
            />
         </fieldset>

         <fieldset>
            <legend>Institution</legend>
            <SelectInstitution
                text='Institution'
                value={acc.institution_id}
                onChange={onInstitutionChange}
            />
            <Input
                text="IBAN"
                value={acc.iban ?? ''}
                onChange={onIBANChange}
            />
            <Input
                text="Number"
                value={acc.account_num ?? ''}
                onChange={onNumberChange}
            />
         </fieldset>

         <fieldset>
            <legend>Description</legend>

            <TextArea
               rows={10}
               cols={80}
               value={acc.description}
               onChange={onDescrChange}
            />
         </fieldset>

         <ButtonBar>
            <Button
               primary={true}
               text='Save'
               onClick={onSave}
            />
         </ButtonBar>

      </form>
   );
}
export default AccountEdit;
