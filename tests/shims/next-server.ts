type NextRequestInit = ConstructorParameters<typeof Request>[1];

export class NextRequest extends Request {
  public readonly nextUrl: URL;

  constructor(input: RequestInfo | URL, init?: NextRequestInit) {
    super(input, init);
    this.nextUrl = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    );
  }
}

export class NextResponse extends Response {
  static json(data: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);

    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    return new NextResponse(JSON.stringify(data), {
      ...init,
      headers
    });
  }

  static next(init: ResponseInit = {}) {
    const headers = new Headers(init.headers);

    headers.set("x-middleware-next", "1");

    return new NextResponse(null, {
      ...init,
      headers,
      status: init.status ?? 200
    });
  }
}
