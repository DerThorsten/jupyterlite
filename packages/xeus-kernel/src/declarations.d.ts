declare module '*?raw' {
  const res: string;
  return res;
}

declare module '*.whl' {
  const res: string;
  return res;
}

declare let package_path: string;