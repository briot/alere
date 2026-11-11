Everything that can be configured by the user is a Panel.

In each directory (NetWorth, Ledger,...) we have the following organization:

   - View.tsx
     Defines a react component, independent of our panels framework.
     It includes custom properties for this component. Those properties must
     be encodable as JSON so that we can save them across sessions.
     Cannot depend on any of the following files.

   - Settings.tsx
     Tightly linked to Panel.tsx, provides the settings dialog.
     Will depend on View.tsx to get the properties type of the view.

   - Panel.tsx
     Provides the actual panel implementation. This is build by using the
     Panel component provided in the Dashboard module (which supports titles,
     settings dialog,...)
     It also provides a `register()` function so that we can associate the name
     of our panels to a factory function, and thus reload saved dashboards.

   - Page.tsx
     Only exists when the panel can be set as a full page component.
     ??? This is in fact going away, as all pages are now written as a
     configurable dashboards made up of panels

