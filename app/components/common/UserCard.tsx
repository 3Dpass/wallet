type IRegistrarInfoItem = {
    Raw: string;
}

type IRegistrarInfo = {
    display: IRegistrarInfoItem;
    email: IRegistrarInfoItem;
    web: IRegistrarInfoItem;
    twitter: IRegistrarInfoItem;
    // image: Any;
}

export type IPalletIdentityRegistrarInfo = {
    account: string;
    fee: string;
    fields: number[];
    info: IRegistrarInfo;
    judgements: string[][];
    regIndex: number;
}

type IProps = {
    registrarInfo: IPalletIdentityRegistrarInfo;
}

export default function UserCard({ registrarInfo }: IProps) {
  return (
    <>
        <div>{registrarInfo.info.display.Raw as string}</div>
        {registrarInfo.judgements && (
            <div>
                <span>{registrarInfo.judgements[0][0] as string}</span>
                <span>{registrarInfo.judgements[0][1] as string}</span>
            </div>
        )}
        <div>{registrarInfo.info.email.Raw as string}</div>
        <div>{registrarInfo.info.web.Raw as string}</div>
        <div>{registrarInfo.info.twitter.Raw as string}</div>
    </>
  );
}
