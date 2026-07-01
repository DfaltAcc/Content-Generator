// CSS Module mock — returns a Proxy that returns the property name as the class name
const handler: ProxyHandler<Record<string, string>> = {
  get(_target, prop) {
    if (typeof prop === "string") {
      return prop;
    }
    return "";
  },
};

const styleMock = new Proxy({} as Record<string, string>, handler);

export default styleMock;
