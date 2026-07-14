declare module 'virtual:starlight-asyncapi/schemas' {
  const StarlightAsyncAPISchemas: Record<string, import('./libs/schemas/schema').Schema>

  export default StarlightAsyncAPISchemas
}

declare module 'virtual:starlight-asyncapi/context' {
  const Context: import('./libs/vite').StarlightAsyncAPIContext

  export default Context
}
