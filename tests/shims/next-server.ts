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

  static redirect(url: string | URL, init: number | ResponseInit = 307) {
    const status = typeof init === "number" ? init : init.status ?? 307;
    const headers = new Headers(typeof init === "number" ? undefined : init.headers);

    headers.set("location", String(url));

    return new NextResponse(null, {
      ...(typeof init === "number" ? {} : init),
      headers,
      status
    });
  }
}
