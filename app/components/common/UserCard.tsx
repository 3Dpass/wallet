import { Card, Classes, Elevation, Icon, IconSize, Tag } from "@blueprintjs/core";
type IRegistrarInfoItem = {
    Raw: string;
}

type IRegistrarInfo = {
    display: IRegistrarInfoItem;
    email: IRegistrarInfoItem;
    web: IRegistrarInfoItem;
    twitter: IRegistrarInfoItem;
    image: IRegistrarInfoItem;
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
    <Card>
        <div className="block mb-2">
            <div className="flex items-center gap-x-6">
            {registrarInfo.info?.image?.Raw && (
                <img className="h-16 w-16 rounded-full" src={registrarInfo.info.image.Raw as string} alt=""/>
            )}
            {!registrarInfo.info?.image?.Raw && (
                <Icon icon="person" iconSize={IconSize.LARGE * 3} title="no foto"></Icon>
            )}
            <div>
                <h3 className="text-base font-semibold leading-7 tracking-tight text-white-900">{registrarInfo.info?.display?.Raw as string}</h3>
                <p className="text-sm font-semibold leading-6 text-indigo-600">{registrarInfo.account}</p>
            </div>
            </div>
        </div>

        {registrarInfo.judgements && (
            <div className="mb-2">
                <Tag round large className={`${Classes.BREADCRUMB_CURRENT} bg-lime-500`}>
                    {registrarInfo.judgements[0][0] as string} {registrarInfo.judgements[0][1] as string}
                </Tag>
            </div>
        )}

        <div className="grid grid-cols-2 gap-1">
            <div>EMAIL</div>
            <div>{registrarInfo.info?.email.Raw as string}</div>
            <div>WEBSITE</div>
            <div>{registrarInfo.info?.web.Raw as string}</div>
            <div>TWITTER</div>
            <div>{registrarInfo.info?.twitter.Raw as string}</div>
        </div>
    </Card>
  );
}
