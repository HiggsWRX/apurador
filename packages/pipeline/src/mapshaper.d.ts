// O mapshaper não traz tipos. O pipeline usa só a interface de programa dele: os comandos, os arquivos de entrada pelo
// nome e os de saída pelo nome, com o conteúdo em texto ou em bytes.
declare module "mapshaper" {
  const mapshaper: {
    applyCommands(comandos: string, entrada: Record<string, Uint8Array | string>): Promise<Record<string, Uint8Array | string>>;
  };
  export default mapshaper;
}
